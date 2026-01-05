import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriggerRequest {
  map_id: string;
  modal_endpoint?: string;
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

    const { map_id, modal_endpoint }: TriggerRequest = await req.json();

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

    // Generate signed URLs for the TIF files (valid for 1 hour)
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

    // Update status to processing
    await supabase
      .from('user_maps')
      .update({ status: 'processing' })
      .eq('id', map_id);

    // Prepare the job payload for Modal
    const jobPayload = {
      map_id: mapData.id,
      name: mapData.name,
      color_tif_url: colorUrl.signedUrl,
      bw_tif_url: bwUrl.signedUrl,
      roi_coordinates: mapData.roi_coordinates,
      processing_parameters: mapData.processing_parameters,
      webhook_url: `${supabaseUrl}/functions/v1/map-processing-webhook`,
      webhook_secret: webhookSecret,
    };

    console.log('Job payload prepared for map:', map_id);

    // If a Modal endpoint is provided, trigger it
    if (modal_endpoint) {
      try {
        const modalResponse = await fetch(modal_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jobPayload),
        });

        if (!modalResponse.ok) {
          console.error('Modal trigger failed:', await modalResponse.text());
          // Don't fail the request, just log the error
        } else {
          console.log('Modal processing triggered successfully');
        }
      } catch (modalError) {
        console.error('Failed to trigger Modal:', modalError);
        // Don't fail the request, Modal can poll for jobs instead
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Processing triggered',
        job: jobPayload,
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
