import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const publicId = url.searchParams.get("id");
    if (!publicId || !/^[A-Za-z0-9_-]{1,64}$/.test(publicId)) {
      return new Response("Invalid id", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase
      .from("rewrites")
      .select("html_rewritten, source_url, persona_id")
      .eq("public_id", publicId)
      .maybeSingle();
    if (error || !data) {
      return new Response("Rewrite not found", { status: 404, headers: corsHeaders });
    }

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
