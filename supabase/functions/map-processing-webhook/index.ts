import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface ProcessingUpdate {
  map_id: string
  status: 'processing' | 'completed' | 'failed'
  error_message?: string
  route_count?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('MAP_PROCESSING_WEBHOOK_SECRET')
    
    if (!expectedSecret) {
      console.error('MAP_PROCESSING_WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    if (req.method === 'POST' && action === 'update-status') {
      // Update job status
      const body: ProcessingUpdate = await req.json()
      console.log('Updating map status:', body)

      const { error } = await supabase
        .from('user_maps')
        .update({
          status: body.status,
          error_message: body.error_message || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.map_id)

      if (error) {
        console.error('Error updating map status:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Map status updated successfully')
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST' && action === 'complete') {
      // Mark processing as complete and create route_maps entry
      const body = await req.json()
      const { map_id, route_data } = body
      console.log('Completing map processing:', map_id)

      // Get the user_map details
      const { data: userMap, error: fetchError } = await supabase
        .from('user_maps')
        .select('*')
        .eq('id', map_id)
        .single()

      if (fetchError || !userMap) {
        console.error('Error fetching user map:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Map not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create route_maps entry for this user map
      const { data: routeMap, error: routeMapError } = await supabase
        .from('route_maps')
        .insert({
          name: userMap.name,
          user_id: userMap.user_id,
          source_map_id: map_id,
          is_public: false,
          description: `Custom map uploaded by user`,
          map_type: 'forest',
        })
        .select()
        .single()

      if (routeMapError) {
        console.error('Error creating route_maps entry:', routeMapError)
        return new Response(
          JSON.stringify({ error: 'Failed to create route map' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert route images if provided
      if (route_data && Array.isArray(route_data)) {
        const routeImages = route_data.map((route: any, index: number) => ({
          map_id: routeMap.id,
          candidate_index: index,
          main_route_length: route.main_route_length || null,
          alt_route_length: route.alt_route_length || null,
          aspect_ratio: route.aspect_ratio || '16_9',
          shortest_side: route.shortest_side || 'main',
          image_path: route.image_path,
        }))

        const { error: imagesError } = await supabase
          .from('route_images')
          .insert(routeImages)

        if (imagesError) {
          console.error('Error inserting route images:', imagesError)
        }
      }

      // Update user_map status to completed
      await supabase
        .from('user_maps')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', map_id)

      console.log('Map processing completed successfully')
      return new Response(
        JSON.stringify({ success: true, route_map_id: routeMap.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET' && action === 'pending') {
      // Get all pending jobs for processing
      const { data, error } = await supabase
        .from('user_maps')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching pending maps:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch pending maps' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate signed URLs for the TIF files
      const mapsWithUrls = await Promise.all(
        (data || []).map(async (map: any) => {
          const { data: colorUrl } = await supabase.storage
            .from('user-map-sources')
            .createSignedUrl(map.color_tif_path, 3600) // 1 hour

          const { data: bwUrl } = await supabase.storage
            .from('user-map-sources')
            .createSignedUrl(map.bw_tif_path, 3600)

          return {
            ...map,
            color_tif_url: colorUrl?.signedUrl || null,
            bw_tif_url: bwUrl?.signedUrl || null,
          }
        })
      )

      return new Response(
        JSON.stringify({ jobs: mapsWithUrls }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST' && action === 'upload-image') {
      // Handle image upload from processing service
      const formData = await req.formData()
      const mapId = formData.get('map_id') as string
      const imageName = formData.get('image_name') as string
      const imageFile = formData.get('image') as File

      if (!mapId || !imageName || !imageFile) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user_id from map
      const { data: userMap } = await supabase
        .from('user_maps')
        .select('user_id, name')
        .eq('id', mapId)
        .single()

      if (!userMap) {
        return new Response(
          JSON.stringify({ error: 'Map not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const filePath = `${userMap.user_id}/${userMap.name}/${imageName}`
      
      const { error: uploadError } = await supabase.storage
        .from('user-route-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Failed to upload image' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Image uploaded successfully:', filePath)
      return new Response(
        JSON.stringify({ success: true, path: filePath }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})