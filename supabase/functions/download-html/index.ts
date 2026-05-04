import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session");
    if (!sessionId) throw new Error("session is required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return new Response("Payment not completed", { status: 402, headers: corsHeaders });
    }
    const publicId = session.metadata?.publicId;
    if (!publicId) throw new Error("publicId missing in session metadata");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase
      .from("rewrites")
      .select("html_rewritten, source_url, persona_id")
      .eq("public_id", publicId)
      .maybeSingle();
    if (error || !data) throw new Error("Rewrite not found");

    let host = "site";
    try { host = new URL(data.source_url).hostname.replace(/\W+/g, "-"); } catch { /* noop */ }
    const filename = `${host}-${data.persona_id}.html`;

    return new Response(data.html_rewritten, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(msg, { status: 500, headers: corsHeaders });
  }
});
