import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('MAP_PROCESSING_WEBHOOK_SECRET')
    
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid or missing webhook secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // UPDATE STATUS
    if (req.method === 'POST' && action === 'update-status') {
      const body = await req.json()
      console.log('Updating map status:', body)
      
      await supabase.from('user_maps').update({
        status: body.status,
        error_message: body.error_message || null,
        updated_at: new Date().toISOString(),
      }).eq('id', body.map_id)

      return new Response(JSON.stringify({ success: true }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // COMPLETE PROCESSING
    if (req.method === 'POST' && action === 'complete') {
      const { map_id, route_count, csv_data } = await req.json()
      console.log('Completing map:', map_id, 'routes:', route_count)

      const { data: userMap } = await supabase.from('user_maps').select('*').eq('id', map_id).single()
      if (!userMap) {
        return new Response(JSON.stringify({ error: 'Map not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: routeMap, error: routeMapError } = await supabase.from('route_maps').insert({
        name: userMap.name,
        user_id: userMap.user_id,
        source_map_id: map_id,
        is_public: false,
        description: `Custom map with ${route_count || 0} routes`,
        map_type: 'forest',
      }).select().single()

      if (routeMapError) {
        console.error('Error creating route_maps:', routeMapError)
        return new Response(JSON.stringify({ error: 'Failed to create route map' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (csv_data && Array.isArray(csv_data)) {
        const routeImages: any[] = []
        const basePath = `${userMap.user_id}/${map_id}`
        
        for (const route of csv_data) {
          routeImages.push({
            map_id: routeMap.id, candidate_index: route.id,
            main_route_length: route.main_length || null, alt_route_length: route.alt_length || null,
            aspect_ratio: '16_9', shortest_side: route.main_side?.toLowerCase() || 'left',
            image_path: `${basePath}/16_9/candidate_${route.id}.webp`,
          }, {
            map_id: routeMap.id, candidate_index: route.id,
            main_route_length: route.main_length || null, alt_route_length: route.alt_length || null,
            aspect_ratio: '9_16', shortest_side: route.main_side?.toLowerCase() || 'left',
            image_path: `${basePath}/9_16/candidate_${route.id}.webp`,
          })
        }
        if (routeImages.length > 0) {
          await supabase.from('route_images').insert(routeImages)
        }
      }

      await supabase.from('user_maps').update({
        status: 'completed', updated_at: new Date().toISOString(),
      }).eq('id', map_id)

      return new Response(JSON.stringify({ success: true, route_map_id: routeMap.id }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // FAILED PROCESSING
    if (req.method === 'POST' && action === 'failed') {
      const { map_id, error_message } = await req.json()
      console.log('Map failed:', map_id, error_message)
      
      await supabase.from('user_maps').update({
        status: 'failed', error_message: error_message || 'Unknown error',
        updated_at: new Date().toISOString(),
      }).eq('id', map_id)

      return new Response(JSON.stringify({ success: true }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET PENDING JOBS
    if (req.method === 'GET' && action === 'pending') {
      const { data } = await supabase.from('user_maps')
        .select('*').in('status', ['pending', 'processing']).order('created_at', { ascending: true })

      const mapsWithUrls = await Promise.all((data || []).map(async (map: any) => {
        const { data: colorUrl } = await supabase.storage.from('user-map-sources').createSignedUrl(map.color_tif_path, 3600)
        const { data: bwUrl } = await supabase.storage.from('user-map-sources').createSignedUrl(map.bw_tif_path, 3600)
        return { ...map, color_tif_url: colorUrl?.signedUrl, bw_tif_url: bwUrl?.signedUrl }
      }))

      return new Response(JSON.stringify({ jobs: mapsWithUrls }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // UPLOAD IMAGE
    if (req.method === 'POST' && action === 'upload-image') {
      const contentType = req.headers.get('content-type') || ''
      let mapId: string, storagePath: string, imageData: Uint8Array, mimeType = 'image/webp'

      if (contentType.includes('application/json')) {
        const body = await req.json()
        mapId = body.map_id; storagePath = body.storage_path; mimeType = body.content_type || 'image/webp'
        if (!mapId || !storagePath || !body.image_data) {
          return new Response(JSON.stringify({ error: 'Missing fields' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const bin = atob(body.image_data)
        imageData = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) imageData[i] = bin.charCodeAt(i)
      } else {
        const formData = await req.formData()
        mapId = formData.get('map_id') as string
        storagePath = formData.get('image_name') as string
        const imageFile = formData.get('image') as File
        if (!mapId || !storagePath || !imageFile) {
          return new Response(JSON.stringify({ error: 'Missing fields' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        imageData = new Uint8Array(await imageFile.arrayBuffer())
      }

      const { data: userMap } = await supabase.from('user_maps').select('user_id').eq('id', mapId).single()
      if (!userMap) {
        return new Response(JSON.stringify({ error: 'Map not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Modal sends storagePath as: mapId/aspect/filename.webp
      // We prepend userId only: userId/mapId/aspect/filename.webp
      const filePath = `${userMap.user_id}/${storagePath}`
      const { error: uploadError } = await supabase.storage.from('user-route-images')
        .upload(filePath, imageData, { contentType: mimeType, cacheControl: '3600', upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return new Response(JSON.stringify({ error: uploadError.message }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await supabase.from('user_maps').update({ last_activity_at: new Date().toISOString() }).eq('id', mapId)
      return new Response(JSON.stringify({ success: true, path: filePath }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // CHECK STALE
    if (req.method === 'POST' && action === 'check-stale') {
      const staleTime = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: staleMaps } = await supabase.from('user_maps')
        .select('*').eq('status', 'processing').lt('last_activity_at', staleTime)

      const results: any[] = []
      for (const map of staleMaps || []) {
        const { data: files } = await supabase.storage.from('user-route-images').list(`${map.user_id}/${map.id}/16_9`)
        const count = files?.length || 0

        if (count > 0) {
          const { data: routeMap } = await supabase.from('route_maps').insert({
            name: map.name, user_id: map.user_id, source_map_id: map.id,
            is_public: false, description: `${count} routes (auto-completed)`, map_type: 'forest',
          }).select().single()

          if (routeMap) {
            const routeImages = files!.map((f: any, i: number) => ({
              map_id: routeMap.id, candidate_index: i,
              aspect_ratio: '16_9', shortest_side: 'left',
              image_path: `${map.user_id}/${map.id}/16_9/${f.name}`,
            }))
            await supabase.from('route_images').insert(routeImages)
          }
          await supabase.from('user_maps').update({ status: 'completed' }).eq('id', map.id)
          results.push({ map_id: map.id, action: 'completed', routes: count })
        } else {
          await supabase.from('user_maps').update({ status: 'failed', error_message: 'Processing timeout' }).eq('id', map.id)
          results.push({ map_id: map.id, action: 'failed' })
        }
      }
      return new Response(JSON.stringify({ processed: results }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // CHECK MAP STATUS
    if (req.method === 'GET' && action === 'check-map-status') {
      const mapId = url.searchParams.get('map_id')
      if (!mapId) {
        return new Response(JSON.stringify({ error: 'map_id required' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: map } = await supabase.from('user_maps').select('*').eq('id', mapId).single()
      if (!map) {
        return new Response(JSON.stringify({ error: 'Not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: files16 } = await supabase.storage.from('user-route-images').list(`${map.user_id}/${map.id}/16_9`)
      const { data: files9 } = await supabase.storage.from('user-route-images').list(`${map.user_id}/${map.id}/9_16`)

      return new Response(JSON.stringify({
        status: map.status, last_activity_at: map.last_activity_at,
        images_16_9: files16?.length || 0, images_9_16: files9?.length || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
