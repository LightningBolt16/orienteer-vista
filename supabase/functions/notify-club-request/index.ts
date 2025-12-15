import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClubRequestNotification {
  clubName: string;
  requestedBy: string;
  description?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-club-request function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clubName, requestedBy, description }: ClubRequestNotification = await req.json();
    console.log("Club request notification for:", clubName, "by:", requestedBy);

    // Get the user's name from user_profiles
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("name")
      .eq("user_id", requestedBy)
      .single();

    const requesterName = profile?.name || "Unknown user";

    // Send email to admin
    const emailResponse = await resend.emails.send({
      from: "Ljungdell.uk <onboarding@resend.dev>",
      to: ["elias.ljungdell@gmail.com"],
      subject: `New Club Request: ${clubName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Club Request</h1>
          <p>A new club has been requested on Ljungdell.uk:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Club Name:</strong> ${clubName}</p>
            <p><strong>Requested By:</strong> ${requesterName}</p>
            ${description ? `<p><strong>Description:</strong> ${description}</p>` : ""}
          </div>
          <p>Please review this request in the admin panel.</p>
          <a href="https://ljungdell.uk/admin/club-requests" 
             style="display: inline-block; background: #f20dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
            Review Request
          </a>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-club-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
