import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { publicId, email } = await req.json().catch(() => ({}));
    if (!publicId || typeof publicId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(publicId)) {
      return new Response(JSON.stringify({ error: "Invalid publicId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: rewrite } = await supabase
      .from("rewrites")
      .select("public_id, source_url, persona_name")
      .eq("public_id", publicId)
      .maybeSingle();
    if (!rewrite) {
      return new Response(JSON.stringify({ error: "Rewrite not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate-limit by IP — 30 emails per hour
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "unknown";
    const { data: rate } = await supabase.rpc("check_and_record_rate_limit", {
      p_ip: `ip:${ip}`,
      p_action: "send-download-link",
      p_limit: 30,
      p_window_minutes: 60,
      p_user_id: null,
    });
    if (rate && (rate as { allowed: boolean }).allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Try later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const downloadUrl = `https://liketony.ai/d?id=${encodeURIComponent(publicId)}`;
    const messageId = `rewrite-download:${publicId}:${email}:${Date.now()}`;

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
        idempotencyKey: messageId,
        templateData: {
          downloadUrl,
          sourceUrl: rewrite.source_url || "your landing",
          personaName: rewrite.persona_name || "Tony",
        },
      }),
    });

    if (!sendResp.ok) {
      const text = await sendResp.text();
      console.error("send-transactional-email failed", sendResp.status, text);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
