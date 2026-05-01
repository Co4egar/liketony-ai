// Shared utilities for fetching + rewriting landing pages.
// Used by both `process-site` (one-shot) and any future split functions.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export interface Segment {
  id: number;
  kind: "text" | "title" | "meta-description" | "alt" | "aria-label";
  text: string;
}

// Use printable ASCII tokens — Postgres text columns reject NUL (\u0000).
const PLACEHOLDER_PREFIX = "@@PSWAP_";
const PLACEHOLDER_SUFFIX = "@@";

const placeholder = (id: number) => `${PLACEHOLDER_PREFIX}${id}${PLACEHOLDER_SUFFIX}`;

const SKIP_TAGS = new Set([
  "script", "style", "noscript", "code", "pre", "svg", "canvas",
]);

const MIN_LEN = 2;
const MAX_SEGMENTS = 250;

/**
 * Walk the HTML, replace each meaningful text node / attribute with a unique
 * placeholder token, and return both the templated HTML and the segments to
 * rewrite. We use raw string scanning (no DOM parser in Deno edge runtime).
 */
export function extractSegments(html: string): {
  template: string;
  segments: Segment[];
} {
  const segments: Segment[] = [];
  let nextId = 0;

  // 1) <title>
  let template = html.replace(
    /(<title[^>]*>)([\s\S]*?)(<\/title>)/i,
    (_m, open, inner, close) => {
      const trimmed = inner.trim();
      if (!trimmed) return `${open}${inner}${close}`;
      const id = nextId++;
      segments.push({ id, kind: "title", text: trimmed });
      return `${open}${placeholder(id)}${close}`;
    },
  );

  // 2) <meta name="description" content="..."> and og/twitter descriptions
  template = template.replace(
    /<meta\b([^>]*?)\bcontent\s*=\s*("([^"]*)"|'([^']*)')([^>]*)>/gi,
    (match, before, _quoted, dq, sq, after) => {
      const attrs = `${before} ${after}`.toLowerCase();
      const isDesc =
        /\b(name|property)\s*=\s*("|')(description|og:description|twitter:description|og:title|twitter:title)\2/.test(
          attrs,
        );
      if (!isDesc) return match;
      const value = dq ?? sq ?? "";
      const trimmed = value.trim();
      if (!trimmed || segments.length >= MAX_SEGMENTS) return match;
      const id = nextId++;
      const kind: Segment["kind"] = /title/.test(attrs)
        ? "title"
        : "meta-description";
      segments.push({ id, kind, text: trimmed });
      return match.replace(value, placeholder(id));
    },
  );

  // 3) alt="" and aria-label=""
  template = template.replace(
    /\b(alt|aria-label)\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (match, name, _quoted, dq, sq) => {
      const value = dq ?? sq ?? "";
      const trimmed = value.trim();
      if (trimmed.length < MIN_LEN || segments.length >= MAX_SEGMENTS) return match;
      const id = nextId++;
      segments.push({
        id,
        kind: name.toLowerCase() === "alt" ? "alt" : "aria-label",
        text: trimmed,
      });
      return match.replace(value, placeholder(id));
    },
  );

  // 4) Visible text nodes — naive but effective: split on tags, walk through.
  const parts = template.split(/(<[^>]+>)/);
  let inSkip = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("<")) {
      const tagMatch = part.match(/^<\/?\s*([a-zA-Z0-9]+)/);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (SKIP_TAGS.has(tag)) {
          if (part.startsWith("</")) inSkip = Math.max(0, inSkip - 1);
          else if (!part.endsWith("/>")) inSkip++;
        }
      }
      continue;
    }
    if (inSkip > 0) continue;
    const raw = part;
    const trimmed = raw.trim();
    if (trimmed.length < MIN_LEN) continue;
    // Skip if it's just punctuation / numbers
    if (!/[a-zA-Zа-яА-Я]/.test(trimmed)) continue;
    if (segments.length >= MAX_SEGMENTS) continue;
    const id = nextId++;
    segments.push({ id, kind: "text", text: trimmed });
    // Preserve surrounding whitespace.
    const leading = raw.match(/^\s*/)?.[0] ?? "";
    const trailing = raw.match(/\s*$/)?.[0] ?? "";
    parts[i] = `${leading}${placeholder(id)}${trailing}`;
  }

  return { template: parts.join(""), segments };
}

/** Re-insert rewritten segments back into the templated HTML. */
export function applyRewrites(
  template: string,
  segments: Segment[],
  rewritten: Record<number, string>,
): string {
  let out = template;
  for (const seg of segments) {
    const replacement = rewritten[seg.id] ?? seg.text;
    // Escape for HTML attribute contexts vs text contexts.
    const safe =
      seg.kind === "text"
        ? replacement
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
        : replacement.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    out = out.split(placeholder(seg.id)).join(safe);
  }
  // Safety net: strip any orphan placeholders left behind so they never appear in the UI.
  out = out.replace(/@@PSWAP_\d+@@/g, "");
  // Also strip any stray NUL bytes (Postgres TEXT can't store them).
  out = out.replace(/\u0000/g, "");
  return out;
}

export function generatePublicId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Throws if invalid
  const u = new URL(url);
  return u.toString();
}
