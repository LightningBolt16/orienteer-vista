import { createClient } from 'npm:@supabase/supabase-js@2'

const VERSION = "route-finder-trigger-v1.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Trigger Route Finder map processing on Modal.
 * 
 * This uses a SEPARATE Modal endpoint from Route Choice processing.
 * The Modal processor (route-finder-processor) will:
 * 1. Generate a skeleton graph from the B&W map
 * 2. Find long routes (800-2500px) suitable for Route Finder
 * 3. Create base images (clean map with start/finish only)
 * 4. Create answer images (map with optimal route overlay)
 * 5. Export simplified graph JSON for each challenge
 * 6. Upload images and complete via webhook
 */

Deno.serve(async (req) => {
  console.log(`${VERSION} - Route Finder trigger received`)
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const webhookSecret = Deno.env.get('MAP_PROCESSING_WEBHOOK_SECRET') ?? ''

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { map_id, map_name, processing_parameters } = body

    if (!map_id) {
      return new Response(JSON.stringify({ error: 'map_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log('Triggering Route Finder processing for map:', map_id)

    // Get map details using service role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: userMap, error: mapError } = await serviceClient
      .from('user_maps')
      .select('*')
      .eq('id', map_id)
      .eq('user_id', user.id)
      .single()

    if (mapError || !userMap) {
      console.error('Map not found or access denied:', mapError)
      return new Response(JSON.stringify({ error: 'Map not found or access denied' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Modal endpoint for Route Finder processing - SEPARATE from Route Choice
    // Uses MODAL_ROUTE_FINDER_ENDPOINT_URL instead of shared MODAL_ENDPOINT_URL
    const modalEndpoint = Deno.env.get('MODAL_ROUTE_FINDER_ENDPOINT_URL')
    if (!modalEndpoint) {
      console.error('MODAL_ROUTE_FINDER_ENDPOINT_URL not configured - this is a SEPARATE endpoint from Route Choice')
      return new Response(JSON.stringify({ error: 'Route Finder processing service not configured. Please add MODAL_ROUTE_FINDER_ENDPOINT_URL secret.' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Use the same Modal endpoint - the 'mode' parameter will differentiate processing
    // The Modal script checks for mode='route_finder' in processing_parameters

    // Prepare webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/map-processing-webhook`

    let jobPayload: Record<string, unknown>
    const storageProvider = userMap.storage_provider || 'supabase'

    if (storageProvider === 'r2') {
      // R2 storage - pass R2 keys directly to Modal
      // Modal will download using its own R2 credentials
      console.log('Using R2 storage for Route Finder map:', map_id)
      
      jobPayload = {
        map_id: userMap.id,
        name: map_name || userMap.name,
        user_id: user.id,
        storage_provider: 'r2',
        r2_color_key: userMap.r2_color_key,
        r2_bw_key: userMap.r2_bw_key,
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
    } else {
      // Supabase storage - generate signed URLs
      console.log('Using Supabase storage for Route Finder map:', map_id)

      const { data: colorUrl } = await serviceClient.storage
        .from('user-map-sources')
        .createSignedUrl(userMap.color_tif_path, 3600)

      const { data: bwUrl } = await serviceClient.storage
        .from('user-map-sources')
        .createSignedUrl(userMap.bw_tif_path, 3600)

      if (!colorUrl?.signedUrl || !bwUrl?.signedUrl) {
        console.error('Failed to generate signed URLs for Supabase storage')
        return new Response(JSON.stringify({ error: 'Failed to generate signed URLs' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      jobPayload = {
        map_id: userMap.id,
        name: map_name || userMap.name,
        user_id: user.id,
        storage_provider: 'supabase',
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
    }

    console.log('Sending to Modal Route Finder processor:', JSON.stringify({
      map_id,
      map_name: jobPayload.name,
      storage_provider: storageProvider,
      mode: 'route_finder',
    }))

    // Trigger Modal processing - using the same endpoint but with mode='route_finder'
    const modalResponse = await fetch(modalEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobPayload),
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
      storage_provider: storageProvider,
      call_id: modalResult.call_id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error triggering Route Finder processing:', error)
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
