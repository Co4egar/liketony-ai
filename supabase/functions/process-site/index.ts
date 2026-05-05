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
  mode?: "persona" | "optimize"; // optimize = Tony Bot, max-conversion, no persona caricature
  persona?: {
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
    knowledgeBase?: Record<string, unknown>;
  };
}

const TONY_BOT_PERSONA: NonNullable<RequestBody["persona"]> = {
  id: "tony-bot",
  name: "Tony Bot",
  voicePrompt:
    "You are Tony Bot — a top-tier direct-response copywriter (Hormozi × Halbert × Sugarman). You write the highest-converting version of any landing page: crystal-clear value prop, concrete outcomes, specificity over fluff, strong CTAs, real tension. No persona caricature, no accent, no jokes — just the most persuasive, on-brand sales copy a human reader would respect and click.",
  tone: "Confident, direct, plainspoken. Earns trust with specifics, not adjectives.",
  rhythm: "Short sentences. Punchy. Then one longer line that lands the benefit.",
  vocabulary: "Concrete nouns and verbs. Numbers, names, outcomes. Cut filler words: 'world-class', 'innovative', 'solutions', 'leverage', 'seamless'.",
  signatureMoves:
    "Lead with the outcome the customer gets. Quantify (numbers, time, $). Replace company-speak with you-language. Make CTAs verbs of action. Add micro-proof where it fits.",
  taboos:
    "No buzzwords. No corporate fluff. No emojis. No fake urgency. No invented facts/numbers/prices. No persona quirks or accents.",
  accent: "",
  verbalTics: "",
  signaturePhrases: [],
  examples: [],
  knowledgeBase: {},
};

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
  persona: NonNullable<RequestBody["persona"]>,
  intensity: number,
  mode: "persona" | "optimize" = "persona",
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
  const knowledgeBlock = p.knowledgeBase && Object.keys(p.knowledgeBase).length
    ? `\nDEEP RESEARCH NOTES (use only for voice/style grounding; do not invent factual claims from this):\n${JSON.stringify(p.knowledgeBase).slice(0, 6000)}\n`
    : "";

  const personaSystem = `You are NOT writing as a generic copywriter. You ARE ${p.name}.
Write every word as ${p.name} would write it. Caricature level: 4 out of 5 — unmistakably this character, almost parody, but not so over-the-top it becomes unreadable.

=== VOICE PROFILE: ${p.name} ===

SUMMARY:
${p.voicePrompt}

${sectionIf("TONE", p.tone)}${sectionIf("RHYTHM", p.rhythm)}${sectionIf("VOCABULARY", p.vocabulary)}${sectionIf("SIGNATURE MOVES", p.signatureMoves)}${sectionIf("ACCENT (render phonetically in spelling)", p.accent)}${sectionIf("VERBAL TICS (sprinkle through, not in every line)", p.verbalTics)}${sectionIf("TABOOS — never do these", p.taboos)}${
    p.signaturePhrases?.length
      ? `SIGNATURE PHRASES (work 2-4 of these into the page where they fit naturally; do not stuff every segment):\n- ${p.signaturePhrases.join("\n- ")}\n`
      : ""
  }${examplesBlock}${knowledgeBlock}

TONE INTENSITY DIAL: ${clamp}/100 — ${toneLabel}.
Apply consistently across every segment: lower = softer, higher = more sales-driven and direct. The character voice stays at caricature 4/5 regardless of dial.

ABSOLUTE RULES (these override voice):
1. Preserve original meaning, claims, numbers, prices, names, product features, and URLs. Do NOT invent facts. You may dramatize HOW it's said, never WHAT is true.
2. The character voice is the WHOLE POINT — do not water it down. Channel the persona through WORD CHOICE, accent spelling, and tics — never through inflating length. A 3-word headline stays a 3-word headline, just spoken in-character. Example: "Get Started" by Bugs Bunny → "Go, Doc!".
3. LENGTH IS A HARD CONSTRAINT — break it and the layout breaks. Each segment carries a "maxChars" budget. Your output for that id MUST be ≤ maxChars characters AND should keep roughly the same word count/line rhythm. Nav/buttons/tiny labels must stay essentially the same visual width. Cut filler before exceeding the budget. If you can't fit the persona in the budget, pick the most in-character short phrase rather than padding.
4. Match the original language (Russian → Russian, English → English). Even when matching language, KEEP the character's accent quirks and tics adapted into that language so the persona is unmistakable.
5. Every rewritten headline/paragraph must contain at least ONE clear character marker (accent spelling, tic, signature move, or signature phrase). For very short segments (≤4 words / nav / buttons), one well-chosen in-character word is enough — do NOT cram a full catchphrase into a button. Distribute markers across the page.
6. Never output HTML tags or placeholder tokens. No emojis unless the original had them.
7. Output STRICT JSON: { "rewrites": { "<id>": "<new text>", ... } } with one entry per input id.

If the segment is a 1-2 word nav label or button, render it as ${p.name} would say that exact action — short, in-character, no extra words, ≤ maxChars.`;

  const optimizeSystem = `You are Tony Bot — a senior direct-response copywriter. Your job: rewrite this landing page to MAXIMIZE selling power. No persona, no character voice, no jokes, no accent. Just the highest-converting professional copy a human reader would respect.

OPTIMIZATION GOALS — push every axis to 18-20/20:
- CLARITY: A first-time visitor must understand "what is this, who is it for, what do I get" in 5 seconds.
- SPECIFICITY: Replace vague adjectives ("world-class", "innovative", "seamless", "best-in-class") with concrete nouns, numbers, named outcomes. NEVER invent facts/numbers/prices not in the original — if no number exists, use a concrete benefit instead of a fluffy adjective.
- OUTCOME FOCUS: Speak to what the customer GETS, not what the company IS. Lead with you-language and the result.
- CTA: Every call-to-action becomes a clear action verb that names what happens next.
- VOICE: Confident, plainspoken, direct. Real tension. No corporate filler. Short punchy sentences mixed with one longer benefit-line.

ABSOLUTE RULES:
1. Preserve all factual claims, numbers, prices, product names, feature names, and URLs from the original. You can re-frame HOW things are said; you cannot invent WHAT is true.
2. LENGTH IS A HARD CONSTRAINT — each segment has a "maxChars" budget. Your output MUST be ≤ maxChars and keep roughly the same word count and line rhythm. Nav/button labels keep essentially the same visual width.
3. Match the original language (Russian → Russian, English → English).
4. No emojis unless the original had them. No HTML tags. No placeholder tokens.
5. No persona quirks, accents, jokes, or signature phrases. Sound like a top human copywriter, not a character.
6. Output STRICT JSON: { "rewrites": { "<id>": "<new text>", ... } } with one entry per input id.

For very short segments (nav/buttons ≤4 words): use the strongest plain-English action verb that fits the budget.`;

  const system = mode === "optimize" ? optimizeSystem : personaSystem;

  // Per-segment length budget the LLM must respect — mirrors constrainRewritesForLayout.
  const budgetFor = (kind: Segment["kind"], len: number): number => {
    if (kind === "button") return len;
    if (kind === "title") return Math.max(len + 6, Math.ceil(len * 1.12));
    if (kind === "meta-description") return Math.max(len + 12, Math.ceil(len * 1.18));
    if (kind === "alt" || kind === "aria-label") return Math.max(len + 4, Math.ceil(len * 1.1));
    if (len <= 12) return len;
    if (len <= 25) return Math.max(len + 2, Math.ceil(len * 1.08));
    if (len <= 60) return Math.max(len + 4, Math.ceil(len * 1.1));
    if (len <= 140) return Math.max(len + 10, Math.ceil(len * 1.15));
    return Math.max(len + 24, Math.ceil(len * 1.18));
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
      temperature: 1.3,
      top_p: 0.95,
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

interface AxisScore {
  score: number; // 0..20
  note: string;  // <= 90 chars
}
interface SellingScore {
  total: number; // 0..100
  axes: {
    clarity: AxisScore;
    specificity: AxisScore;
    outcome: AxisScore;
    cta: AxisScore;
    voice: AxisScore;
  };
}
interface ScoreResponse {
  before: SellingScore;
  after: SellingScore;
}

const AXIS_KEYS = ["clarity", "specificity", "outcome", "cta", "voice"] as const;

function clampAxis(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 10;
  return Math.max(0, Math.min(20, Math.round(n)));
}

function normalizeScore(raw: any): SellingScore {
  const axes: any = {};
  let total = 0;
  for (const k of AXIS_KEYS) {
    const a = raw?.axes?.[k] ?? {};
    const score = clampAxis(a.score);
    const note = typeof a.note === "string" ? a.note.slice(0, 120) : "";
    axes[k] = { score, note };
    total += score;
  }
  return { total, axes };
}

function joinSegmentsForScoring(segments: Segment[], rewrittenMap?: Record<number, string>): string {
  // Take a representative slice, prioritize hero/title/text. Cap ~6000 chars.
  const priority: Record<string, number> = {
    title: 0, "meta-description": 1, button: 2, text: 3, alt: 4, "aria-label": 5,
  };
  const sorted = [...segments].sort(
    (a, b) => (priority[a.kind] ?? 9) - (priority[b.kind] ?? 9),
  );
  const lines: string[] = [];
  let chars = 0;
  for (const s of sorted) {
    const txt = (rewrittenMap ? rewrittenMap[s.id] : undefined) ?? s.text;
    const clean = txt.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const line = `[${s.kind}] ${clean}`;
    if (chars + line.length > 6000) break;
    lines.push(line);
    chars += line.length + 1;
  }
  return lines.join("\n");
}

async function scoreSellingPower(
  segments: Segment[],
  rewrittenMap: Record<number, string>,
): Promise<ScoreResponse | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;
  if (segments.length === 0) return null;

  const beforeText = joinSegmentsForScoring(segments);
  const afterText = joinSegmentsForScoring(segments, rewrittenMap);
  if (!beforeText || !afterText) return null;

  const system = `You are a hard-nosed direct-response copy critic. Score two versions of the SAME landing page on 5 axes, each 0-20. Be harsh and consistent: most real-world landing pages score 8-13 per axis. The rewrite is NOT automatically better — if the rewrite is worse on an axis, score it lower. Calibrate BEFORE and AFTER against each other.

Axes (each 0-20):
- clarity: Is the value prop understandable in 5 seconds? Who is it for, what do they get?
- specificity: Concrete numbers, names, results vs vague fluff ("world-class", "innovative", "solutions").
- outcome: Speaks to customer outcomes/benefits vs the company's features and self-praise.
- cta: Clear, action-oriented call(s) to action that tell the visitor what to do next.
- voice: Tension, hook, distinctive voice vs bland corporate filler.

For each axis return a tiny note (max ~80 chars) explaining the score in plain English.`;

  const user = `BEFORE (original landing copy):
${beforeText}

---
AFTER (rewritten landing copy):
${afterText}`;

  const tool = {
    type: "function",
    function: {
      name: "report_selling_score",
      description: "Return scores for both versions.",
      parameters: {
        type: "object",
        properties: {
          before: scoreSchema(),
          after: scoreSchema(),
        },
        required: ["before", "after"],
        additionalProperties: false,
      },
    },
  };

  try {
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
        tools: [tool],
        tool_choice: { type: "function", function: { name: "report_selling_score" } },
        temperature: 0.3,
      }),
    });
    if (!resp.ok) {
      console.warn("scoring failed:", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return {
      before: normalizeScore(parsed.before),
      after: normalizeScore(parsed.after),
    };
  } catch (e) {
    console.warn("scoring error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

function scoreSchema() {
  const axis = {
    type: "object",
    properties: {
      score: { type: "number", minimum: 0, maximum: 20 },
      note: { type: "string" },
    },
    required: ["score", "note"],
    additionalProperties: false,
  };
  return {
    type: "object",
    properties: {
      axes: {
        type: "object",
        properties: {
          clarity: axis,
          specificity: axis,
          outcome: axis,
          cta: axis,
          voice: axis,
        },
        required: ["clarity", "specificity", "outcome", "cta", "voice"],
        additionalProperties: false,
      },
    },
    required: ["axes"],
    additionalProperties: false,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const mode: "persona" | "optimize" = body.mode === "optimize" ? "optimize" : "persona";
    const persona = mode === "optimize" ? TONY_BOT_PERSONA : body.persona;
    if (!body?.url || !persona?.voicePrompt) {
      return json({ error: "url and persona required" }, 400);
    }

    // Determine client identity: logged-in users bypass IP rate limit.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Skip if it's just the anon key (no real session)
      if (token !== anonKey) {
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        userId = userData.user?.id ?? null;
      }
    }

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "unknown";

    // Identify by user_id when logged in, otherwise by IP. Limit: 20 per hour.
    const rateKey = userId ? `user:${userId}` : `ip:${ip}`;
    const { data: rateData, error: rateErr } = await supabaseAdmin.rpc(
      "check_and_record_rate_limit",
      {
        p_ip: rateKey,
        p_action: "rewrite",
        p_limit: 20,
        p_window_minutes: 60,
        p_user_id: null,
      },
    );
    if (rateErr) console.error("rate limit check failed:", rateErr);
    if (rateData && (rateData as { allowed: boolean }).allowed === false) {
      return json(
        {
          error: "rate_limited",
          message: "Limit reached: 20 rewrites per hour. Try again later.",
        },
        429,
      );
    }

    const url = normalizeUrl(body.url);
    const html = await scrape(url);
    const { template, segments } = extractSegments(html);
    const intensity = typeof body.intensity === "number" ? body.intensity : 50;
    const rewrittenMap = await rewriteSegments(segments, persona, intensity, mode);
    const safeRewrittenMap = constrainRewritesForLayout(segments, rewrittenMap);
    const finalHtml = applyRewrites(template, segments, safeRewrittenMap);

    // Convert JS-dependent scraped pages into visible static previews.
    const previewHtml = prepareStaticPreviewHtml(finalHtml, url);
    const originalPreview = prepareStaticPreviewHtml(html, url);

    // Score selling power before/after — non-blocking on failure.
    const sellingScore = await scoreSellingPower(segments, safeRewrittenMap);

    // Persist for share link.
    const supabase = supabaseAdmin;
    const publicId = generatePublicId();
    const { error: insertErr } = await supabase.from("rewrites").insert({
      public_id: publicId,
      source_url: url,
      persona_id: persona.id,
      persona_name: persona.name,
      html_original: html,
      html_rewritten: finalHtml,
      selling_score: sellingScore,
    });
    if (insertErr) console.error("rewrites insert failed:", insertErr);

    // Bump global persona usage counter (fire-and-forget).
    supabase
      .rpc("increment_persona_usage", { p_persona_id: persona.id })
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
      sellingScore,
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
