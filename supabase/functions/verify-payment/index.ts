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
    const { sessionId } = await req.json().catch(() => ({}));
    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 200 || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return new Response(JSON.stringify({ paid: false, error: "Invalid sessionId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (email && publicId) {
      const messageId = `rewrite-download:${sessionId}`;
      // Dedup by sessionId — bots can't loop verify-payment to re-send emails.
      const { data: existing } = await supabase
        .from("email_send_log")
        .select("id")
        .eq("message_id", messageId)
        .maybeSingle();

      if (!existing) {
        const downloadUrl = `https://liketony.ai/d?session=${encodeURIComponent(sessionId)}`;
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
              messageId,
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
              message_id: messageId,
              template_name: "rewrite-download",
              recipient_email: email,
              status: "queued",
              error_message: `session:${sessionId}`,
            });
          }
        } catch (e) {
          console.error("Failed to send download email", e);
        }
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
