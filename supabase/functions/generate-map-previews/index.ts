import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Trigger backend (Modal) generation of full-map browser-safe previews
 * (PNG/WebP) from R2 source TIFFs. Modal will read the source TIFF using
 * Pillow (which handles every TIFF compression we encounter in practice)
 * and POST the resulting PNGs back to map-processing-webhook/register-previews
 * which stores their URLs on user_maps and route_maps.
 *
 * Body:
 *  - user_map_id?: string  (preferred — generates from user_maps.r2_*_key)
 *  - route_map_id?: string (admin/official maps — generates from route_maps.{color,bw}_r2_key)
 *
 * Marks the row as preview_status='generating' immediately so the UI can
 * reflect the in-progress state.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('MAP_PROCESSING_WEBHOOK_SECRET')!;
    const previewEndpoint =
      Deno.env.get('MODAL_PREVIEW_ENDPOINT_URL') ||
      Deno.env.get('MODAL_ENDPOINT_URL'); // fallback so it can share the existing Modal app

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

    const body = await req.json().catch(() => ({}));
    const { user_map_id, route_map_id } = body as {
      user_map_id?: string;
      route_map_id?: string;
    };

    if (!user_map_id && !route_map_id) {
      return new Response(
        JSON.stringify({ error: 'user_map_id or route_map_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Resolve source asset keys (R2). We only support R2 right now since that
    // is where browser-unfriendly TIFFs live for both user-uploaded maps and
    // admin-uploaded official maps.
    let r2ColorKey: string | null = null;
    let r2BwKey: string | null = null;
    let targetTable: 'user_maps' | 'route_maps' = 'user_maps';
    let targetId: string;
    let mapName = 'preview';
    let ownerId: string | null = null;

    if (user_map_id) {
      targetTable = 'user_maps';
      targetId = user_map_id;
      const { data, error } = await supabase
        .from('user_maps')
        .select('id, name, user_id, r2_color_key, r2_bw_key')
        .eq('id', user_map_id)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'user_map not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      r2ColorKey = data.r2_color_key;
      r2BwKey = data.r2_bw_key;
      mapName = data.name;
      ownerId = data.user_id;
    } else if (route_map_id) {
      targetTable = 'route_maps';
      targetId = route_map_id;
      const { data, error } = await supabase
        .from('route_maps')
        .select('id, name, user_id, color_r2_key, bw_r2_key, source_map_id')
        .eq('id', route_map_id)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'route_map not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      r2ColorKey = data.color_r2_key;
      r2BwKey = data.bw_r2_key;
      mapName = data.name;
      ownerId = data.user_id;

      // Fall back to source user_map keys if the route_map doesn't have its own
      if ((!r2ColorKey || !r2BwKey) && data.source_map_id) {
        const { data: src } = await supabase
          .from('user_maps')
          .select('r2_color_key, r2_bw_key')
          .eq('id', data.source_map_id)
          .single();
        if (src) {
          r2ColorKey = r2ColorKey || src.r2_color_key;
          r2BwKey = r2BwKey || src.r2_bw_key;
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'No target' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!r2ColorKey && !r2BwKey) {
      // Mark as unavailable — there is literally nothing for Modal to read
      await supabase
        .from(targetTable)
        .update({
          preview_status: 'unavailable',
          preview_error: 'No R2 source keys present',
        })
        .eq('id', targetId);
      return new Response(
        JSON.stringify({
          status: 'unavailable',
          message: 'No source assets available to generate previews from',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Mark as generating
    await supabase
      .from(targetTable)
      .update({ preview_status: 'generating', preview_error: null })
      .eq('id', targetId);

    if (!previewEndpoint) {
      // Modal preview endpoint not configured — leave row marked generating
      // and return an instructive error so admins know to set the secret.
      await supabase
        .from(targetTable)
        .update({
          preview_status: 'failed',
          preview_error: 'MODAL_PREVIEW_ENDPOINT_URL secret not configured',
        })
        .eq('id', targetId);
      return new Response(
        JSON.stringify({
          status: 'failed',
          error:
            'Backend preview generator endpoint is not configured. Add the MODAL_PREVIEW_ENDPOINT_URL secret pointing to the Modal preview-generator function.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Trigger Modal — fire-and-forget; it will call back via the webhook
    const jobPayload = {
      target_table: targetTable,
      target_id: targetId,
      owner_id: ownerId,
      map_name: mapName,
      r2_color_key: r2ColorKey,
      r2_bw_key: r2BwKey,
      webhook_url: `${supabaseUrl}/functions/v1/map-processing-webhook`,
      webhook_secret: webhookSecret,
    };

    try {
      const modalResp = await fetch(previewEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobPayload),
      });
      if (!modalResp.ok) {
        const txt = await modalResp.text();
        console.error('Modal preview trigger failed:', txt);
        await supabase
          .from(targetTable)
          .update({
            preview_status: 'failed',
            preview_error: `Modal trigger failed: ${txt.slice(0, 200)}`,
          })
          .eq('id', targetId);
        return new Response(
          JSON.stringify({ status: 'failed', error: 'Modal trigger failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } catch (e: any) {
      console.error('Modal trigger network error:', e);
      await supabase
        .from(targetTable)
        .update({
          preview_status: 'failed',
          preview_error: `Network error: ${e.message}`,
        })
        .eq('id', targetId);
      return new Response(
        JSON.stringify({ status: 'failed', error: e.message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        status: 'generating',
        message: 'Preview generation started — call again or refetch the row to see when it is ready.',
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('generate-map-previews error:', e);
    return new Response(
      JSON.stringify({ error: e.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
