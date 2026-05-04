import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const { publicId, sourceUrl, personaName } = await req.json().catch(() => ({}));
    if (!publicId || typeof publicId !== "string" || publicId.length > 64 || !/^[A-Za-z0-9_-]+$/.test(publicId)) {
      return new Response(JSON.stringify({ error: "Invalid publicId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate publicId actually exists — prevents bots from spamming Stripe with fake IDs.
    const { data: rewrite } = await supabase
      .from("rewrites")
      .select("public_id, source_url, persona_name")
      .eq("public_id", publicId)
      .maybeSingle();
    if (!rewrite) {
      return new Response(JSON.stringify({ error: "Rewrite not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // IP rate limit: 20 checkout sessions per hour per IP.
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "unknown";
    const { data: rate } = await supabase.rpc("check_and_record_rate_limit", {
      p_ip: `ip:${ip}`,
      p_action: "create-checkout",
      p_limit: 20,
      p_window_minutes: 60,
      p_user_id: null,
    });
    if (rate && (rate as { allowed: boolean }).allowed === false) {
      return new Response(JSON.stringify({ error: "Too many checkout attempts. Try later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const origin = req.headers.get("origin") ?? "";
    const safeSourceUrl = (sourceUrl ?? rewrite.source_url ?? "").toString().slice(0, 500);
    const safePersonaName = (personaName ?? rewrite.persona_name ?? "").toString().slice(0, 80);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "auto",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 1900,
            product_data: {
              name: "LikeTony.ai — HTML download",
              description: safeSourceUrl
                ? `Rewritten landing for ${safeSourceUrl}`
                : "One-time access to download your rewritten landing HTML.",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        publicId,
        sourceUrl: safeSourceUrl,
        personaName: safePersonaName,
      },
      success_url: `${origin}/?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?paid=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
