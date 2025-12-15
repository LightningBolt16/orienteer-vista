import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClubApprovedNotification {
  clubName: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-club-approved function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clubName, userId }: ClubApprovedNotification = await req.json();
    console.log("Club approved notification for:", clubName, "user:", userId);

    // Get the user's email from auth.users
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      console.error("Could not find user email:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userEmail = userData.user.email;
    console.log("Sending approval email to:", userEmail);

    // Send email to user
    const emailResponse = await resend.emails.send({
      from: "Ljungdell.uk <noreply@ljungdell.uk>",
      to: [userEmail],
      subject: `Your Club "${clubName}" Has Been Approved!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">🎉 Congratulations!</h1>
          <p>Great news! Your club <strong>${clubName}</strong> has been approved on Ljungdell.uk.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>You are now the admin of your club. You can:</p>
            <ul>
              <li>Invite members to join</li>
              <li>Upload a club logo</li>
              <li>View club statistics and leaderboards</li>
            </ul>
          </div>
          <a href="https://ljungdell.uk/clubs" 
             style="display: inline-block; background: #f20dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
            View Your Club
          </a>
        </div>
      `,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-club-approved:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
