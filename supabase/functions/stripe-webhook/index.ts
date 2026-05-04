import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (e) {
    console.error("Webhook signature verification failed", e);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const publicId = session.metadata?.publicId ?? null;
  const sourceUrl = session.metadata?.sourceUrl ?? "";
  const personaName = session.metadata?.personaName ?? "Tony";

  if (!email || !publicId) {
    console.warn("Missing email or publicId on session", sessionId);
    return new Response(JSON.stringify({ received: true, skipped: "missing data" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Dedup by sessionId
  const { data: existing } = await supabase
    .from("email_send_log")
    .select("id")
    .eq("recipient_email", email)
    .eq("template_name", "rewrite-download")
    .ilike("error_message", `session:${sessionId}%`)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ received: true, dedup: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const downloadUrl = `${supabaseUrl}/functions/v1/download-html?session=${encodeURIComponent(sessionId)}`;

  try {
    const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateName: "rewrite-download",
        recipientEmail: email,
        idempotencyKey: `rewrite-download:${sessionId}`,
        templateData: {
          downloadUrl,
          sourceUrl: sourceUrl || "your landing",
          personaName: personaName || "Tony",
        },
      }),
    });
    if (!sendResp.ok) {
      console.error("send-transactional-email failed", sendResp.status, await sendResp.text());
    } else {
      await supabase.from("email_send_log").insert({
        message_id: crypto.randomUUID(),
        template_name: "rewrite-download",
        recipient_email: email,
        status: "queued",
        error_message: `session:${sessionId}`,
      });
    }
  } catch (e) {
    console.error("Failed to send download email", e);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
