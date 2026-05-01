// One-shot endpoint: scrape with Firecrawl, rewrite via Lovable AI, persist, return preview + share id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  applyRewrites,
  constrainRewritesForLayout,
  corsHeaders,
  extractSegments,
  generatePublicId,
  normalizeUrl,
  prepareStaticPreviewHtml,
  type Segment,
} from "../_shared/landing.ts";

interface RequestBody {
  url: string;
  persona: {
    id: string;
    name: string;
    voicePrompt: string;
    signaturePhrases?: string[];
  };
}

const MAX_HTML_BYTES = 1_500_000; // 1.5MB safety cap
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

async function scrape(url: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");

  const resp = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["rawHtml", "html"],
      onlyMainContent: false,
      waitFor: 1500,
    }),
  });

  const data = await resp.json().catch(() => null) as any;
  if (!resp.ok) {
    const msg = data?.error || `Firecrawl failed (${resp.status})`;
    if (resp.status === 402) {
      throw new Error("Firecrawl out of credits. Top up the connection or try later.");
    }
    throw new Error(msg);
  }
  // Prefer rawHtml — it preserves the original <head>, <link rel=stylesheet>,
  // inline <style>, and full DOM. The `html` field is a cleaned/main-content
  // version that strips styles and breaks the visual layout.
  const payload = data?.data ?? data;
  const html: string | undefined =
    payload?.rawHtml ?? payload?.raw_html ?? payload?.html;
  if (!html) throw new Error("No HTML returned from scrape");
  if (html.length > MAX_HTML_BYTES) {
    throw new Error("Page too large to process (limit ~1.5MB)");
  }
  return html;
}

async function rewriteSegments(
  segments: Segment[],
  persona: RequestBody["persona"],
): Promise<Record<number, string>> {
  if (segments.length === 0) return {};
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const system = `You are a copywriter rewriting landing page text in the unmistakable voice of ${persona.name}.

VOICE BRIEF:
${persona.voicePrompt}
${persona.signaturePhrases?.length ? `Signature phrases (use sparingly, max 1-2 across the whole page): ${persona.signaturePhrases.join(" | ")}` : ""}

ABSOLUTE RULES:
1. Preserve the original meaning, claims, and any concrete numbers, prices, names, product features, or URLs. Do NOT invent facts.
2. Keep each rewritten segment within the original layout space. Headlines, cards, buttons, and menu items must stay almost the same length as the original (never more than +10–15%). Longer paragraphs may be up to +20%.
3. Match the original language. If the source is in Russian, respond in Russian. If English, English. Etc.
4. Never include HTML tags. Never include the placeholder tokens.
5. Short navigation labels, button text, and single words should stay short and snappy.
6. Output STRICT JSON: { "rewrites": { "<id>": "<new text>", ... } } with one entry per input id.`;

  const user = `Rewrite each of these segments. They come from one landing page; treat them as a coherent whole.

Segments (JSON):
${JSON.stringify(segments.map(s => ({ id: s.id, kind: s.kind, text: s.text })))}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("AI rate limit hit, try again in a minute.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace > Usage.");
    const text = await resp.text();
    throw new Error(`AI gateway error ${resp.status}: ${text.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned non-JSON output");
  }
  const map: Record<number, string> = {};
  const rewrites = parsed?.rewrites ?? parsed;
  if (rewrites && typeof rewrites === "object") {
    for (const [k, v] of Object.entries(rewrites)) {
      const id = Number(k);
      if (!Number.isNaN(id) && typeof v === "string") map[id] = v;
    }
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.url || !body?.persona?.voicePrompt) {
      return json({ error: "url and persona required" }, 400);
    }

    const url = normalizeUrl(body.url);
    const html = await scrape(url);
    const { template, segments } = extractSegments(html);
    const rewrittenMap = await rewriteSegments(segments, body.persona);
    const safeRewrittenMap = constrainRewritesForLayout(segments, rewrittenMap);
    const finalHtml = applyRewrites(template, segments, safeRewrittenMap);

    // Convert JS-dependent scraped pages into visible static previews.
    const previewHtml = prepareStaticPreviewHtml(finalHtml, url);
    const originalPreview = prepareStaticPreviewHtml(html, url);

    // Persist for share link.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const publicId = generatePublicId();
    const { error: insertErr } = await supabase.from("rewrites").insert({
      public_id: publicId,
      source_url: url,
      persona_id: body.persona.id,
      persona_name: body.persona.name,
      html_original: html,
      html_rewritten: finalHtml,
    });
    if (insertErr) console.error("rewrites insert failed:", insertErr);

    return json({
      publicId,
      url,
      htmlRewritten: finalHtml,
      htmlPreview: previewHtml,
      htmlOriginal: html,
      htmlOriginalPreview: originalPreview,
      segmentCount: segments.length,
      rewrittenCount: Object.keys(safeRewrittenMap).length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("process-site error:", msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
