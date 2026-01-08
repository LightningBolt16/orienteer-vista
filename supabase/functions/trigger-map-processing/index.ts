import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriggerRequest {
  map_id: string;
}

interface TileGrid {
  rows: number;
  cols: number;
  tileWidth: number;
  tileHeight: number;
  originalWidth: number;
  originalHeight: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('MAP_PROCESSING_WEBHOOK_SECRET')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
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

    const { map_id }: TriggerRequest = await req.json();
    const modal_endpoint = Deno.env.get('MODAL_ENDPOINT_URL');

    if (!map_id) {
      return new Response(
        JSON.stringify({ error: 'map_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the map to verify ownership and get details
    const { data: mapData, error: mapError } = await supabase
      .from('user_maps')
      .select('*')
      .eq('id', map_id)
      .eq('user_id', user.id)
      .single();

    if (mapError || !mapData) {
      console.error('Map fetch error:', mapError);
      return new Response(
        JSON.stringify({ error: 'Map not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let jobPayload: Record<string, unknown>;
    const storageProvider = mapData.storage_provider || 'supabase';

    if (storageProvider === 'r2') {
      // R2 storage - pass R2 keys directly to Modal
      // Modal will download using its own R2 credentials
      console.log('Using R2 storage for map:', map_id);
      
      jobPayload = {
        map_id: mapData.id,
        name: mapData.name,
        storage_provider: 'r2',
        r2_color_key: mapData.r2_color_key,
        r2_bw_key: mapData.r2_bw_key,
        roi_coordinates: mapData.roi_coordinates,
        processing_parameters: mapData.processing_parameters,
        webhook_url: `${supabaseUrl}/functions/v1/map-processing-webhook`,
        webhook_secret: webhookSecret,
      };
    } else {
      // Supabase storage - generate signed URLs
      const isTiled = mapData.is_tiled === true && mapData.tile_grid !== null;
      const tileGrid = mapData.tile_grid as TileGrid | null;

      if (isTiled && tileGrid) {
        // Generate signed URLs for all tiles
        const colorTileUrls: string[] = [];
        const bwTileUrls: string[] = [];

        // Extract base path from the stored path
        const basePath = mapData.color_tif_path.replace('/color_tiles', '').replace('/color.tif', '');

        for (let row = 0; row < tileGrid.rows; row++) {
          for (let col = 0; col < tileGrid.cols; col++) {
            const colorTilePath = `${basePath}/color_tile_${row}_${col}.png`;
            const bwTilePath = `${basePath}/bw_tile_${row}_${col}.png`;

            const { data: colorTileUrl } = await supabase.storage
              .from('user-map-sources')
              .createSignedUrl(colorTilePath, 3600);

            const { data: bwTileUrl } = await supabase.storage
              .from('user-map-sources')
              .createSignedUrl(bwTilePath, 3600);

            if (!colorTileUrl?.signedUrl || !bwTileUrl?.signedUrl) {
              console.error(`Failed to generate signed URL for tile ${row}_${col}`);
              return new Response(
                JSON.stringify({ error: `Failed to generate signed URLs for tile ${row}_${col}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            colorTileUrls.push(colorTileUrl.signedUrl);
            bwTileUrls.push(bwTileUrl.signedUrl);
          }
        }

        console.log(`Generated signed URLs for ${colorTileUrls.length} tiles`);

        jobPayload = {
          map_id: mapData.id,
          name: mapData.name,
          storage_provider: 'supabase',
          is_tiled: true,
          color_tile_urls: colorTileUrls,
          bw_tile_urls: bwTileUrls,
          tile_grid: tileGrid,
          roi_coordinates: mapData.roi_coordinates,
          processing_parameters: mapData.processing_parameters,
          webhook_url: `${supabaseUrl}/functions/v1/map-processing-webhook`,
          webhook_secret: webhookSecret,
        };
      } else {
        // Non-tiled: generate single file URLs
        const { data: colorUrl } = await supabase.storage
          .from('user-map-sources')
          .createSignedUrl(mapData.color_tif_path, 3600);

        const { data: bwUrl } = await supabase.storage
          .from('user-map-sources')
          .createSignedUrl(mapData.bw_tif_path, 3600);

        if (!colorUrl?.signedUrl || !bwUrl?.signedUrl) {
          return new Response(
            JSON.stringify({ error: 'Failed to generate signed URLs for map files' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        jobPayload = {
          map_id: mapData.id,
          name: mapData.name,
          storage_provider: 'supabase',
          is_tiled: false,
          color_tif_url: colorUrl.signedUrl,
          bw_tif_url: bwUrl.signedUrl,
          roi_coordinates: mapData.roi_coordinates,
          processing_parameters: mapData.processing_parameters,
          webhook_url: `${supabaseUrl}/functions/v1/map-processing-webhook`,
          webhook_secret: webhookSecret,
        };
      }
    }

    // Update status to processing
    await supabase
      .from('user_maps')
      .update({ status: 'processing' })
      .eq('id', map_id);

    console.log('Job payload prepared for map:', map_id, 'storage:', storageProvider);

    // Trigger Modal processing if endpoint is configured
    if (modal_endpoint) {
      try {
        console.log('Triggering Modal processing at:', modal_endpoint);
        const modalResponse = await fetch(modal_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jobPayload),
        });

        if (!modalResponse.ok) {
          console.error('Modal trigger failed:', await modalResponse.text());
        } else {
          console.log('Modal processing triggered successfully');
        }
      } catch (modalError) {
        console.error('Failed to trigger Modal:', modalError);
      }
    } else {
      console.log('No MODAL_ENDPOINT_URL configured, skipping auto-trigger');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Processing triggered',
        storage_provider: storageProvider,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trigger error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
