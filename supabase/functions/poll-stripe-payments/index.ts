import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// Polls Stripe for recently-paid checkout sessions and sends the download email
// for any session we haven't emailed yet. Triggered by pg_cron every minute.
Deno.serve(async (_req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Last 2 hours window
    const since = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: since },
      limit: 100,
    });

    let sent = 0;
    let skipped = 0;

    for (const session of sessions.data) {
      if (session.payment_status !== "paid") continue;
      const email = session.customer_details?.email ?? session.customer_email ?? null;
      const publicId = session.metadata?.publicId ?? null;
      if (!email || !publicId) { skipped++; continue; }
      const messageId = `rewrite-download:${session.id}`;

      const { data: existing } = await supabase
        .from("email_send_log")
        .select("id")
        .eq("message_id", messageId)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const downloadUrl = `${supabaseUrl}/functions/v1/download-html?session=${encodeURIComponent(session.id)}`;
      const sourceUrl = session.metadata?.sourceUrl ?? "";
      const personaName = session.metadata?.personaName ?? "Tony";

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
          idempotencyKey: `rewrite-download:${session.id}`,
          templateData: {
            downloadUrl,
            sourceUrl: sourceUrl || "your landing",
            personaName: personaName || "Tony",
          },
        }),
      });

      if (!sendResp.ok) {
        console.error("send failed", session.id, sendResp.status, await sendResp.text());
        continue;
      }

      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "rewrite-download",
        recipient_email: email,
        status: "queued",
        error_message: `session:${session.id}`,
      });
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, scanned: sessions.data.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("poll-stripe-payments error", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
