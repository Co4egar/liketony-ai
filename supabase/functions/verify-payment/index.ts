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
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid";

    if (!paid) {
      return new Response(JSON.stringify({ paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const email =
      session.customer_details?.email ??
      session.customer_email ??
      null;
    const publicId = session.metadata?.publicId ?? null;
    const sourceUrl = session.metadata?.sourceUrl ?? "";
    const personaName = session.metadata?.personaName ?? "Tony";

    // Fire-and-forget the email send so the UI returns fast.
    if (email && publicId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabase = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const downloadUrl = `${supabaseUrl}/functions/v1/download-html?session=${encodeURIComponent(sessionId)}`;

      // Idempotency: don't send twice for the same session.
      const idempotencyKey = `rewrite-download:${sessionId}`;

      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "rewrite-download",
            recipientEmail: email,
            idempotencyKey,
            templateData: {
              downloadUrl,
              sourceUrl: sourceUrl || "your landing",
              personaName: personaName || "Tony",
            },
          },
        });
      } catch (e) {
        console.error("Failed to enqueue download email", e);
      }
    }

    return new Response(JSON.stringify({ paid: true, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, paid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
