import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Trigger Route Finder map processing on Modal.
 * 
 * This endpoint initiates the generation of Route Finder challenges from a user's map.
 * The Modal processor will:
 * 1. Generate a skeleton graph from the B&W map
 * 2. Find long routes (800-2500px) suitable for Route Finder
 * 3. Create base images (clean map with start/finish only)
 * 4. Create answer images (map with optimal route overlay)
 * 5. Export simplified graph JSON for each challenge
 * 6. Upload images and complete via webhook
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = claimsData.claims.sub

    const body = await req.json()
    const { map_id, map_name, processing_parameters } = body

    if (!map_id) {
      return new Response(JSON.stringify({ error: 'map_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log('Triggering Route Finder processing for map:', map_id)

    // Get map details
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: userMap, error: mapError } = await serviceClient
      .from('user_maps')
      .select('*')
      .eq('id', map_id)
      .eq('user_id', userId)
      .single()

    if (mapError || !userMap) {
      console.error('Map not found or access denied:', mapError)
      return new Response(JSON.stringify({ error: 'Map not found or access denied' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Generate signed URLs for the TIF files
    const { data: colorUrl } = await serviceClient.storage
      .from('user-map-sources')
      .createSignedUrl(userMap.color_tif_path, 3600)

    const { data: bwUrl } = await serviceClient.storage
      .from('user-map-sources')
      .createSignedUrl(userMap.bw_tif_path, 3600)

    if (!colorUrl?.signedUrl || !bwUrl?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Failed to generate signed URLs' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Prepare webhook URL
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/map-processing-webhook`
    const webhookSecret = Deno.env.get('MAP_PROCESSING_WEBHOOK_SECRET')

    // Modal endpoint for Route Finder processing
    const modalEndpoint = Deno.env.get('MODAL_ENDPOINT_URL')
    if (!modalEndpoint) {
      console.error('MODAL_ENDPOINT_URL not configured')
      return new Response(JSON.stringify({ error: 'Processing service not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Build Route Finder specific endpoint
    // The Modal processor should have a separate endpoint for Route Finder
    const rfEndpoint = modalEndpoint.replace('/process-map', '/process-route-finder')

    // Prepare processing request
    const processingRequest = {
      map_id,
      map_name: map_name || userMap.name,
      user_id: userId,
      color_tif_url: colorUrl.signedUrl,
      bw_tif_url: bwUrl.signedUrl,
      roi_coordinates: userMap.roi_coordinates,
      impassable_annotations: userMap.impassable_annotations || [],
      processing_parameters: {
        ...userMap.processing_parameters,
        ...processing_parameters,
        // Route Finder specific parameters
        mode: 'route_finder',
        min_route_length: 800,
        max_route_length: 2500,
        num_challenges: processing_parameters?.num_challenges || 20,
        graph_simplification_radius: 300,
      },
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
    }

    console.log('Sending to Modal Route Finder processor:', JSON.stringify({
      map_id,
      map_name: processingRequest.map_name,
      mode: 'route_finder',
    }))

    // Trigger Modal processing
    const modalResponse = await fetch(rfEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processingRequest),
    })

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text()
      console.error('Modal processing failed:', errorText)
      return new Response(JSON.stringify({ 
        error: 'Failed to start processing',
        details: errorText,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const modalResult = await modalResponse.json()
    console.log('Modal processing started:', modalResult)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Route Finder processing started',
      call_id: modalResult.call_id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error triggering Route Finder processing:', error)
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
