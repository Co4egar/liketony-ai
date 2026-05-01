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
              "You build short writing-voice briefs for famous (or fictional) people, used to rewrite landing-page copy in their voice. Be specific and useful, not generic.",
          },
          {
            role: "user",
            content: `Person: ${cleanName}

Return STRICT JSON with this shape:
{
  "shortBio": "1 short sentence describing who they are (max 90 chars)",
  "voicePrompt": "A 3-5 sentence brief for a copywriter capturing their voice: tone, sentence rhythm, vocabulary quirks, signature moves, what they avoid",
  "signaturePhrases": ["3-5 short signature phrases or verbal tics"]
}`,
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

    const insertRow = {
      slug,
      name: cleanName,
      category: "custom",
      short_bio: String(profile.shortBio ?? "").slice(0, 200),
      voice_prompt: String(profile.voicePrompt ?? ""),
      signature_phrases: Array.isArray(profile.signaturePhrases)
        ? profile.signaturePhrases.slice(0, 8)
        : [],
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
    name: row.name,
    category: "custom",
    shortBio: row.short_bio,
    voicePrompt: row.voice_prompt,
    signaturePhrases: row.signature_phrases ?? [],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
