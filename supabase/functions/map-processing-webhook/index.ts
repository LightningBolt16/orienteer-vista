import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

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

// Helper function to send email notification
async function sendMapProcessingEmail(
  userEmail: string,
  userName: string,
  mapName: string,
  status: 'completed' | 'failed',
  routeCount?: number,
  errorMessage?: string
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email notification')
    return
  }

  const resend = new Resend(resendApiKey)

  const isSuccess = status === 'completed'
  const subject = isSuccess 
    ? `Your map "${mapName}" is ready!` 
    : `Map processing failed for "${mapName}"`

  const html = isSuccess
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">🎉 Your Map is Ready!</h1>
        <p>Hi ${userName},</p>
        <p>Great news! Your map <strong>"${mapName}"</strong> has been processed successfully.</p>
        <p><strong>${routeCount || 0} route choices</strong> have been generated and are ready for practice.</p>
        <p>
          <a href="https://ljungdell.uk/route-game" 
             style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Start Practicing
          </a>
        </p>
        <p style="margin-top: 24px; color: #666;">Happy orienteering!</p>
        <p style="color: #666;">— The Ljungdell.uk Team</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">⚠️ Map Processing Failed</h1>
        <p>Hi ${userName},</p>
        <p>Unfortunately, we encountered an issue processing your map <strong>"${mapName}"</strong>.</p>
        ${errorMessage ? `<p style="background-color: #fef2f2; padding: 12px; border-radius: 6px; color: #991b1b;">${errorMessage}</p>` : ''}
        <p>Please try uploading your map again. Make sure the TIF files are valid OCAD exports with proper color and black/white versions.</p>
        <p>
          <a href="https://ljungdell.uk/my-maps" 
             style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Try Again
          </a>
        </p>
        <p style="margin-top: 24px; color: #666;">If the problem persists, please contact support.</p>
        <p style="color: #666;">— The Ljungdell.uk Team</p>
      </div>
    `

  try {
    const emailResponse = await resend.emails.send({
      from: 'Ljungdell.uk <noreply@ljungdell.uk>',
      to: [userEmail],
      subject,
      html,
    })
    console.log('Email notification sent:', emailResponse)
  } catch (error) {
    console.error('Failed to send email notification:', error)
  }
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
      const { map_id, route_count, csv_data } = body
      console.log('Completing map processing:', map_id, 'routes:', route_count)

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
          description: `Custom map with ${route_count || 0} generated routes`,
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

      // Insert route images from csv_data (sent by Modal script)
      if (csv_data && Array.isArray(csv_data)) {
        const routeImages: any[] = []
        
        for (const route of csv_data) {
          // Create entries for both 16:9 and 9:16 versions
          const basePath = `${userMap.user_id}/${map_id}`
          
          routeImages.push({
            map_id: routeMap.id,
            candidate_index: route.id,
            main_route_length: route.main_length || null,
            alt_route_length: route.alt_length || null,
            aspect_ratio: '16_9',
            shortest_side: route.main_side?.toLowerCase() || 'left',
            image_path: `${basePath}/16_9/candidate_${route.id}.webp`,
          })
          
          routeImages.push({
            map_id: routeMap.id,
            candidate_index: route.id,
            main_route_length: route.main_length || null,
            alt_route_length: route.alt_length || null,
            aspect_ratio: '9_16',
            shortest_side: route.main_side?.toLowerCase() || 'left',
            image_path: `${basePath}/9_16/candidate_${route.id}.webp`,
          })
        }

        if (routeImages.length > 0) {
          const { error: imagesError } = await supabase
            .from('route_images')
            .insert(routeImages)

          if (imagesError) {
            console.error('Error inserting route images:', imagesError)
          } else {
            console.log(`Inserted ${routeImages.length} route image records`)
          }
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

      // Get user email for notification
      const { data: authUser } = await supabase.auth.admin.getUserById(userMap.user_id)
      if (authUser?.user?.email) {
        // Get user profile for name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', userMap.user_id)
          .single()
        
        await sendMapProcessingEmail(
          authUser.user.email,
          profile?.name || 'Orienteer',
          userMap.name,
          'completed',
          route_count
        )
      }

      console.log('Map processing completed successfully')
      return new Response(
        JSON.stringify({ success: true, route_map_id: routeMap.id, route_count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST' && action === 'failed') {
      // Handle failed processing and send notification
      const body = await req.json()
      const { map_id, error_message } = body
      console.log('Map processing failed:', map_id, error_message)

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

      // Update status to failed
      await supabase
        .from('user_maps')
        .update({
          status: 'failed',
          error_message: error_message || 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', map_id)

      // Get user email for notification
      const { data: authUser } = await supabase.auth.admin.getUserById(userMap.user_id)
      if (authUser?.user?.email) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', userMap.user_id)
          .single()
        
        await sendMapProcessingEmail(
          authUser.user.email,
          profile?.name || 'Orienteer',
          userMap.name,
          'failed',
          undefined,
          error_message
        )
      }

      console.log('Map processing failure recorded')
      return new Response(
        JSON.stringify({ success: true }),
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
      // Handle image upload from processing service (supports both FormData and base64 JSON)
      const contentType = req.headers.get('content-type') || ''
      
      let mapId: string
      let storagePath: string
      let imageData: Uint8Array
      let routeIndex: number
      let aspectRatio: string
      let mimeType = 'image/webp'

      if (contentType.includes('application/json')) {
        // Base64 JSON format (from Modal Python script)
        const body = await req.json()
        mapId = body.map_id
        storagePath = body.storage_path
        routeIndex = body.route_index || 0
        aspectRatio = body.aspect_ratio || '16_9'
        mimeType = body.content_type || 'image/webp'
        
        if (!mapId || !storagePath || !body.image_data) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: map_id, storage_path, image_data' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Decode base64 to Uint8Array
        const binaryString = atob(body.image_data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        imageData = bytes
      } else {
        // FormData format (legacy)
        const formData = await req.formData()
        mapId = formData.get('map_id') as string
        const imageName = formData.get('image_name') as string
        const imageFile = formData.get('image') as File
        routeIndex = parseInt(formData.get('route_index') as string || '0', 10)
        aspectRatio = formData.get('aspect_ratio') as string || '16_9'

        if (!mapId || !imageName || !imageFile) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        storagePath = imageName
        imageData = new Uint8Array(await imageFile.arrayBuffer())
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

      const filePath = `${userMap.user_id}/${mapId}/${storagePath}`
      
      const { error: uploadError } = await supabase.storage
        .from('user-route-images')
        .upload(filePath, imageData, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Failed to upload image', details: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Image uploaded successfully:', filePath, 'route:', routeIndex, 'aspect:', aspectRatio)
      return new Response(
        JSON.stringify({ success: true, path: filePath, route_index: routeIndex, aspect_ratio: aspectRatio }),
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