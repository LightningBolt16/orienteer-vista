import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Clone a public map's user_maps record for the current user.
 * Copies R2 keys to user's namespace and creates a new user_maps entry.
 * 
 * Body: { source_map_id: string (route_maps.id) }
 * Returns: { user_map_id: string, ... }
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

    // Get the public route_map
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

    const timestamp = Date.now();
    const cloneName = `${routeMap.name} (edited)`;

    // If map has a source user_maps record, clone from it
    if (routeMap.source_map_id) {
      const { data: sourceUserMap, error: sumError } = await supabase
        .from('user_maps')
        .select('*')
        .eq('id', routeMap.source_map_id)
        .single();

      if (sumError || !sourceUserMap) {
        return new Response(
          JSON.stringify({ error: 'Source map files not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: newUserMap, error: insertError } = await supabase
        .from('user_maps')
        .insert({
          user_id: user.id,
          name: cloneName,
          color_tif_path: sourceUserMap.color_tif_path,
          bw_tif_path: sourceUserMap.bw_tif_path,
          roi_coordinates: sourceUserMap.roi_coordinates,
          processing_parameters: sourceUserMap.processing_parameters || {},
          status: 'pending',
          storage_provider: sourceUserMap.storage_provider || 'r2',
          r2_color_key: sourceUserMap.r2_color_key,
          r2_bw_key: sourceUserMap.r2_bw_key,
          is_tiled: sourceUserMap.is_tiled || false,
          tile_grid: sourceUserMap.tile_grid,
          impassable_annotations: sourceUserMap.impassable_annotations,
          source_public_map_id: source_map_id,
        })
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
          has_impassability: !!routeMap.impassability_image_url,
          source_map: {
            name: routeMap.name,
            r2_color_key: sourceUserMap.r2_color_key,
            r2_bw_key: sourceUserMap.r2_bw_key,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No source user_maps record — create a minimal one for annotation/ROI-only editing
    const { data: newUserMap, error: insertError } = await supabase
      .from('user_maps')
      .insert({
        user_id: user.id,
        name: cloneName,
        color_tif_path: `placeholder/${source_map_id}/color`,
        bw_tif_path: `placeholder/${source_map_id}/bw`,
        roi_coordinates: [],
        processing_parameters: {},
        status: 'pending',
        storage_provider: 'r2',
        source_public_map_id: source_map_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create minimal cloned map:', insertError);
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
        has_impassability: !!routeMap.impassability_image_url,
        source_map: { name: routeMap.name },
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
