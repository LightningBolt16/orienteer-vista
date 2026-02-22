import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Stripe product/price mapping
const PRODUCTS = {
  personal: {
    product_id: "prod_U1gEfKft0U0MEA",
    price_id: "price_1T3crbGrzNv0iKS9FcNOBmtP",
  },
  club: {
    product_id: "prod_U1gHySCgj6lLk2",
    price_id: "price_1T3cudGrzNv0iKS9fjTNLdrC",
  },
};

// Check for manual/free subscriptions in the database (e.g. gifted plans)
async function checkManualSubscription(supabaseClient: any, userId: string) {
  // Direct subscription for this user
  const { data: directSub } = await supabaseClient
    .from("subscriptions")
    .select("plan_type, status, current_period_end, club_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .like("stripe_subscription_id", "manual_%")
    .maybeSingle();

  if (directSub) {
    logStep("Found manual subscription", { plan: directSub.plan_type });
    return {
      subscribed: true,
      plan: directSub.plan_type,
      subscription_end: directSub.current_period_end,
      is_manual: true,
      club_id: directSub.club_id,
    };
  }

  // Check if user is in a club with an active club subscription
  const { data: clubSub } = await supabaseClient
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (clubSub?.club_id) {
    const { data: clubSubscription } = await supabaseClient
      .from("subscriptions")
      .select("plan_type, status, current_period_end")
      .eq("club_id", clubSub.club_id)
      .eq("status", "active")
      .eq("plan_type", "club")
      .maybeSingle();

    if (clubSubscription) {
      logStep("Found club subscription for user's club", { plan: "club" });
      return {
        subscribed: true,
        plan: "club",
        subscription_end: clubSubscription.current_period_end,
        is_manual: true,
        club_id: clubSub.club_id,
      };
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking manual subscriptions");
      // Check for manual/free subscriptions in the database
      const manualSub = await checkManualSubscription(supabaseClient, user.id);
      if (manualSub) {
        return new Response(JSON.stringify(manualSub), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active Stripe subscription, checking manual subscriptions");
      const manualSub = await checkManualSubscription(supabaseClient, user.id);
      if (manualSub) {
        return new Response(JSON.stringify(manualSub), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0].price.product as string;
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // Determine plan type from product ID
    let plan = "personal";
    if (productId === PRODUCTS.club.product_id) {
      plan = "club";
    }

    logStep("Active subscription found", { plan, subscriptionEnd, productId });

    // Sync to subscriptions table
    const { error: upsertError } = await supabaseClient
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan_type: plan,
        status: "active",
        current_period_end: subscriptionEnd,
      }, { onConflict: "stripe_subscription_id" });

    if (upsertError) {
      logStep("Error syncing subscription", { error: upsertError.message });
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan,
      subscription_end: subscriptionEnd,
      product_id: productId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
