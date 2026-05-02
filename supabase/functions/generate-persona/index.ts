// Generate a voice profile for a custom persona name on-demand and cache it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/landing.ts";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return json({ error: "name required" }, 400);
    }
    const cleanName = name.trim().slice(0, 80);
    const slug = `custom-${slugify(cleanName)}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await supabase
      .from("custom_personas")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      return json({ persona: toPersona(existing) });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You build deep writing-voice profiles for famous (or fictional) people, used to rewrite landing-page copy in their voice at caricature level 4/5 — unmistakably them, almost parody but still readable. Where applicable, embed accent/dialect phonetically. Output STRICT JSON only.",
          },
          {
            role: "user",
            content: `User typed: "${cleanName}"

This may be a nickname, alias, title, or fictional-character reference (e.g. "Godfather" → Vito Corleone, "The Rock" → Dwayne Johnson, "Voldemort" → fictional).

Return STRICT JSON with this shape:
{
  "canonicalName": "Proper full name (e.g. 'Vito Corleone' for 'Godfather'). If already a proper name, repeat it.",
  "wikiTitle": "Exact English Wikipedia article title for this PERSON or CHARACTER (never a movie/book/album), with underscores instead of spaces (e.g. 'Vito_Corleone'). Empty string if unsure.",
  "shortBio": "1 short sentence (max 90 chars)",
  "voicePrompt": "3-5 sentence summary brief: tone, rhythm, vocabulary quirks, signature moves, what they avoid",
  "signaturePhrases": ["3-5 short signature phrases or verbal tics"],
  "tone": "1-2 sentences on overall emotional tone",
  "rhythm": "sentence length, cadence, punctuation habits (~50-80 words)",
  "vocabulary": "favorite words, register, slang, jargon (~50-80 words)",
  "signatureMoves": "rhetorical structures used again and again (~50-80 words)",
  "taboos": "things this persona NEVER says or does in writing",
  "accent": "phonetic accent/dialect rendered in spelling — empty string '' if none",
  "verbalTics": "stutters, catch-noises, interjections — empty string '' if none",
  "examples": [
    {"kind": "headline", "before": "<generic SaaS headline>", "after": "<rewritten in their voice>"},
    {"kind": "cta", "before": "<generic CTA>", "after": "<rewritten>"},
    {"kind": "paragraph", "before": "<generic 2-sentence paragraph>", "after": "<rewritten>"}
  ]
}

Be SPECIFIC and CARICATURED. If they have a known accent (Scottish, Brooklyn, Southern, French, Yoda-inverted, etc.), render it in spelling.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      if (resp.status === 429) throw new Error("AI rate limit, try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error ${resp.status}`);
    }
    const data = await resp.json();
    const profile = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");

    const canonicalName = String(profile.canonicalName ?? "").trim().slice(0, 120) || cleanName;
    const wikiTitle = String(profile.wikiTitle ?? "").trim().slice(0, 200);

    const insertRow = {
      slug,
      name: canonicalName,
      canonical_name: canonicalName,
      wiki_title: wikiTitle || null,
      category: "custom",
      short_bio: String(profile.shortBio ?? "").slice(0, 200),
      voice_prompt: String(profile.voicePrompt ?? ""),
      signature_phrases: Array.isArray(profile.signaturePhrases)
        ? profile.signaturePhrases.slice(0, 8)
        : [],
      tone: String(profile.tone ?? ""),
      rhythm: String(profile.rhythm ?? ""),
      vocabulary: String(profile.vocabulary ?? ""),
      signature_moves: String(profile.signatureMoves ?? ""),
      taboos: String(profile.taboos ?? ""),
      accent: String(profile.accent ?? ""),
      verbal_tics: String(profile.verbalTics ?? ""),
      examples: Array.isArray(profile.examples) ? profile.examples.slice(0, 5) : [],
    };
    const { data: inserted, error } = await supabase
      .from("custom_personas")
      .insert(insertRow)
      .select()
      .single();
    if (error) throw error;
    return json({ persona: toPersona(inserted) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-persona error:", msg);
    return json({ error: msg }, 500);
  }
});

// deno-lint-ignore no-explicit-any
function toPersona(row: any) {
  return {
    id: row.slug,
    name: row.canonical_name ?? row.name,
    category: "custom",
    shortBio: row.short_bio,
    voicePrompt: row.voice_prompt,
    signaturePhrases: row.signature_phrases ?? [],
    wikiTitle: row.wiki_title ?? null,
    tone: row.tone ?? "",
    rhythm: row.rhythm ?? "",
    vocabulary: row.vocabulary ?? "",
    signatureMoves: row.signature_moves ?? "",
    taboos: row.taboos ?? "",
    accent: row.accent ?? "",
    verbalTics: row.verbal_tics ?? "",
    examples: row.examples ?? [],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
