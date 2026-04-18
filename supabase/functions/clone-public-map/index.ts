import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Clone a public map's user_maps record for the current user.
 * Returns strict editor-readiness so the wizard never has to guess.
 *
 * editor_status:
 *   - 'ready_full'                   : color + bw editor previews available
 *   - 'ready_color_only'             : color preview available, no bw preview
 *   - 'source_present_preview_missing' : raw R2 source(s) exist but no preview
 *   - 'unavailable'                  : nothing usable
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { source_map_id } = await req.json();
    if (!source_map_id) {
      return new Response(
        JSON.stringify({ error: 'source_map_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: routeMap, error: rmError } = await supabase
      .from('route_maps')
      .select('*')
      .eq('id', source_map_id)
      .single();

    if (rmError || !routeMap) {
      return new Response(
        JSON.stringify({ error: 'Route map not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const resolved = await resolveAssets(supabase, routeMap);

    // Refuse to clone if there is literally nothing to edit
    if (resolved.editor_status === 'unavailable') {
      return new Response(
        JSON.stringify({
          error: 'This map has no editable assets',
          editor_status: 'unavailable',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: existingClone } = await supabase
      .from('user_maps')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_public_map_id', source_map_id)
      .maybeSingle();

    if (existingClone) {
      return new Response(
        JSON.stringify({
          user_map_id: existingClone.id,
          already_exists: true,
          message: 'You already have a clone of this map',
          color_image_url: resolved.colorPreviewUrl,
          impassability_image_url: resolved.bwPreviewUrl,
          editor_status: resolved.editor_status,
          has_color_source: resolved.hasColorSource,
          has_bw_source: resolved.hasBwSource,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cloneName = `${routeMap.name} (edited)`;

    const insertData: Record<string, any> = {
      user_id: user.id,
      name: cloneName,
      roi_coordinates: resolved.sourceUserMap?.roi_coordinates || [],
      processing_parameters: resolved.sourceUserMap?.processing_parameters || {},
      status: 'pending',
      storage_provider: 'r2',
      source_public_map_id: source_map_id,
      r2_color_key: resolved.colorR2Key,
      r2_bw_key: resolved.bwR2Key,
      color_tif_path: resolved.colorR2Key || `placeholder/${source_map_id}/color`,
      bw_tif_path: resolved.bwR2Key || `placeholder/${source_map_id}/bw`,
      is_tiled: resolved.sourceUserMap?.is_tiled || false,
      tile_grid: resolved.sourceUserMap?.tile_grid || null,
      impassable_annotations: resolved.sourceUserMap?.impassable_annotations || null,
      color_preview_url: resolved.colorPreviewUrl,
      bw_preview_url: resolved.bwPreviewUrl,
      preview_status: resolved.editor_status === 'ready_full'
        ? 'ready'
        : resolved.editor_status === 'ready_color_only'
          ? 'partial'
          : resolved.editor_status === 'source_present_preview_missing'
            ? 'pending'
            : 'unavailable',
    };

    const { data: newUserMap, error: insertError } = await supabase
      .from('user_maps')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create cloned map:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to clone map: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        user_map_id: newUserMap.id,
        name: cloneName,
        already_exists: false,
        color_image_url: resolved.colorPreviewUrl,
        impassability_image_url: resolved.bwPreviewUrl,
        editor_status: resolved.editor_status,
        has_color_source: resolved.hasColorSource,
        has_bw_source: resolved.hasBwSource,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Clone error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Resolve real editor-ready assets. Only browser-loadable URLs count as previews.
 * Raw R2 keys count as "source present but preview missing".
 */
async function resolveAssets(supabase: any, routeMap: any) {
  let colorR2Key: string | null = routeMap.color_r2_key || null;
  let bwR2Key: string | null = routeMap.bw_r2_key || null;
  let colorPreviewUrl: string | null = routeMap.color_image_url || null;
  let bwPreviewUrl: string | null = routeMap.impassability_image_url || null;
  let sourceUserMap: any = null;

  if (routeMap.source_map_id) {
    const { data: sum } = await supabase
      .from('user_maps')
      .select('*')
      .eq('id', routeMap.source_map_id)
      .single();
    sourceUserMap = sum;

    if (!colorR2Key && sum?.r2_color_key) colorR2Key = sum.r2_color_key;
    if (!bwR2Key && sum?.r2_bw_key) bwR2Key = sum.r2_bw_key;
    if (!colorPreviewUrl && sum?.color_preview_url) colorPreviewUrl = sum.color_preview_url;
    if (!bwPreviewUrl && sum?.bw_preview_url) bwPreviewUrl = sum.bw_preview_url;
  }

  const hasColorSource = !!(colorR2Key || colorPreviewUrl);
  const hasBwSource = !!(bwR2Key || bwPreviewUrl);

  let editor_status:
    | 'ready_full'
    | 'ready_color_only'
    | 'source_present_preview_missing'
    | 'unavailable';

  if (colorPreviewUrl && bwPreviewUrl) {
    editor_status = 'ready_full';
  } else if (colorPreviewUrl && !bwPreviewUrl && !bwR2Key) {
    editor_status = 'ready_color_only';
  } else if ((colorR2Key || bwR2Key) && (!colorPreviewUrl || (bwR2Key && !bwPreviewUrl))) {
    editor_status = 'source_present_preview_missing';
  } else if (colorPreviewUrl) {
    editor_status = 'ready_color_only';
  } else {
    editor_status = 'unavailable';
  }

  return {
    colorR2Key,
    bwR2Key,
    colorPreviewUrl,
    bwPreviewUrl,
    hasColorSource,
    hasBwSource,
    editor_status,
    sourceUserMap,
  };
}
