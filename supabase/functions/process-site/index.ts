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

interface PersonaExample {
  kind: string;
  before: string;
  after: string;
}

interface RequestBody {
  url: string;
  intensity?: number; // 0 = chill, 100 = aggressive sales
  persona: {
    id: string;
    name: string;
    voicePrompt: string;
    signaturePhrases?: string[];
    tone?: string;
    rhythm?: string;
    vocabulary?: string;
    signatureMoves?: string;
    taboos?: string;
    accent?: string;
    verbalTics?: string;
    examples?: PersonaExample[];
  };
}

const MAX_HTML_BYTES = 8_000_000; // 8MB safety cap
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
  intensity: number,
): Promise<Record<number, string>> {
  if (segments.length === 0) return {};
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const clamp = Math.max(0, Math.min(100, Math.round(intensity)));
  const toneLabel =
    clamp <= 15 ? "very chill, calm, soft, almost editorial — no pressure" :
    clamp <= 35 ? "calm and friendly — informative, low pressure" :
    clamp <= 55 ? "balanced — confident but not pushy" :
    clamp <= 75 ? "punchy and persuasive — clear sales angle, strong verbs" :
    clamp <= 90 ? "aggressive direct-response — urgency, benefit-stacking, power words" :
                  "maximum aggressive sales — Hormozi-grade conversion copy, urgency, scarcity, bold promises";

  const p = persona;
  const sectionIf = (label: string, val?: string) =>
    val && val.trim() ? `${label}:\n${val.trim()}\n` : "";

  const examplesBlock = p.examples?.length
    ? `\nBEFORE / AFTER EXAMPLES (anchor your style on these):\n${p.examples
        .map(
          (e, i) =>
            `${i + 1}. [${e.kind}]\n   BEFORE: ${e.before}\n   AFTER (${p.name}): ${e.after}`,
        )
        .join("\n")}\n`
    : "";

  const system = `You are NOT writing as a generic copywriter. You ARE ${p.name}.
Write every word as ${p.name} would write it. Caricature level: 4 out of 5 — unmistakably this character, almost parody, but not so over-the-top it becomes unreadable.

=== VOICE PROFILE: ${p.name} ===

SUMMARY:
${p.voicePrompt}

${sectionIf("TONE", p.tone)}${sectionIf("RHYTHM", p.rhythm)}${sectionIf("VOCABULARY", p.vocabulary)}${sectionIf("SIGNATURE MOVES", p.signatureMoves)}${sectionIf("ACCENT (render phonetically in spelling)", p.accent)}${sectionIf("VERBAL TICS (sprinkle through, not in every line)", p.verbalTics)}${sectionIf("TABOOS — never do these", p.taboos)}${
    p.signaturePhrases?.length
      ? `SIGNATURE PHRASES (work 2-4 of these into the page where they fit naturally; do not stuff every segment):\n- ${p.signaturePhrases.join("\n- ")}\n`
      : ""
  }${examplesBlock}

TONE INTENSITY DIAL: ${clamp}/100 — ${toneLabel}.
Apply consistently across every segment: lower = softer, higher = more sales-driven and direct. The character voice stays at caricature 4/5 regardless of dial.

ABSOLUTE RULES (these override voice):
1. Preserve original meaning, claims, numbers, prices, names, product features, and URLs. Do NOT invent facts. You may dramatize HOW it's said, never WHAT is true.
2. The character voice is the WHOLE POINT — do not water it down. Channel the persona through WORD CHOICE, accent spelling, and tics — not through inflating length. A 3-word headline stays a 3-word headline, just spoken in-character. Example: "Get Started" by Bugs Bunny → "Let's Go, Doc!" (still 3 words). "Achieve Peak Performance" → "Reach Yer Peak, Doc" — same beat count.
3. LENGTH IS A HARD CONSTRAINT — break it and the layout breaks. Each segment carries a "maxChars" budget. Your output for that id MUST be ≤ maxChars characters. Stay close to the original character count: nav/buttons within ±20%, headlines within ±30%, paragraphs within ±40%. Cut filler before exceeding the budget. If you can't fit the persona in the budget, pick the most in-character single word/phrase rather than padding.
4. Match the original language (Russian → Russian, English → English). Even when matching language, KEEP the character's accent quirks and tics adapted into that language so the persona is unmistakable.
5. Every rewritten headline/paragraph must contain at least ONE clear character marker (accent spelling, tic, signature move, or signature phrase). For very short segments (≤4 words / nav / buttons), one well-chosen in-character word is enough — do NOT cram a full catchphrase into a button. Distribute markers across the page.
6. Never output HTML tags or placeholder tokens. No emojis unless the original had them.
7. Output STRICT JSON: { "rewrites": { "<id>": "<new text>", ... } } with one entry per input id.

If the segment is a 1-2 word nav label or button, render it as ${p.name} would say that exact action — short, in-character, no extra words, ≤ maxChars.`;

  // Per-segment length budget the LLM must respect — mirrors constrainRewritesForLayout.
  const budgetFor = (kind: Segment["kind"], len: number): number => {
    if (kind === "button") return Math.max(len + 6, Math.ceil(len * 1.25));
    if (kind === "title") return Math.max(len + 20, Math.ceil(len * 1.5));
    if (kind === "meta-description") return Math.max(len + 30, Math.ceil(len * 1.4));
    if (kind === "alt" || kind === "aria-label") return Math.max(len + 8, Math.ceil(len * 1.3));
    if (len <= 12) return Math.max(len + 4, Math.ceil(len * 1.5));
    if (len <= 25) return Math.max(len + 8, Math.ceil(len * 1.4));
    if (len <= 60) return Math.max(len + 16, Math.ceil(len * 1.45));
    if (len <= 140) return Math.max(len + 30, Math.ceil(len * 1.5));
    return Math.max(len + 60, Math.ceil(len * 1.6));
  };

  const user = `Rewrite each of these segments. They come from one landing page; treat them as a coherent whole. Respect the maxChars budget for every id — going over breaks the page layout.

Segments (JSON):
${JSON.stringify(segments.map(s => {
  const len = Array.from(s.text.replace(/\s+/g, " ").trim()).length;
  return { id: s.id, kind: s.kind, originalChars: len, maxChars: budgetFor(s.kind, len), text: s.text };
}))}`;

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
    const intensity = typeof body.intensity === "number" ? body.intensity : 50;
    const rewrittenMap = await rewriteSegments(segments, body.persona, intensity);
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

    // Bump global persona usage counter (fire-and-forget).
    supabase
      .rpc("increment_persona_usage", { p_persona_id: body.persona.id })
      .then(({ error }) => {
        if (error) console.error("increment_persona_usage failed:", error);
      });

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
