import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Clone a public map's user_maps record for the current user.
 * Prefers route_maps-level R2 keys, then falls back to source user_maps.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { source_map_id } = await req.json();
    if (!source_map_id) {
      return new Response(
        JSON.stringify({ error: 'source_map_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the public route_map (including new R2 key fields)
    const { data: routeMap, error: rmError } = await supabase
      .from('route_maps')
      .select('*')
      .eq('id', source_map_id)
      .single();

    if (rmError || !routeMap) {
      return new Response(
        JSON.stringify({ error: 'Route map not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already cloned this map
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
          message: 'You already have a clone of this map' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cloneName = `${routeMap.name} (edited)`;

    // Determine R2 keys: prefer route_maps-level keys, then source user_maps keys
    let colorR2Key = routeMap.color_r2_key || null;
    let bwR2Key = routeMap.bw_r2_key || null;
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
    }

    // Build the insert record
    const insertData: Record<string, any> = {
      user_id: user.id,
      name: cloneName,
      roi_coordinates: sourceUserMap?.roi_coordinates || [],
      processing_parameters: sourceUserMap?.processing_parameters || {},
      status: 'pending',
      storage_provider: 'r2',
      source_public_map_id: source_map_id,
      r2_color_key: colorR2Key,
      r2_bw_key: bwR2Key,
      color_tif_path: colorR2Key || `placeholder/${source_map_id}/color`,
      bw_tif_path: bwR2Key || `placeholder/${source_map_id}/bw`,
      is_tiled: sourceUserMap?.is_tiled || false,
      tile_grid: sourceUserMap?.tile_grid || null,
      impassable_annotations: sourceUserMap?.impassable_annotations || null,
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        user_map_id: newUserMap.id,
        name: cloneName,
        already_exists: false,
        has_impassability: !!routeMap.impassability_image_url || !!bwR2Key,
        source_map: {
          name: routeMap.name,
          r2_color_key: colorR2Key,
          r2_bw_key: bwR2Key,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Clone error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
