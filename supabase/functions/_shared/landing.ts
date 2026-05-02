// Shared utilities for fetching + rewriting landing pages.
// Used by both `process-site` (one-shot) and any future split functions.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export interface Segment {
  id: number;
  kind: "text" | "button" | "title" | "meta-description" | "alt" | "aria-label";
  text: string;
}

// Use printable ASCII tokens — Postgres text columns reject NUL (\u0000).
const PLACEHOLDER_PREFIX = "@@PSWAP_";
const PLACEHOLDER_SUFFIX = "@@";

const placeholder = (id: number) => `${PLACEHOLDER_PREFIX}${id}${PLACEHOLDER_SUFFIX}`;

const SKIP_TAGS = new Set([
  "script", "style", "noscript", "code", "pre", "svg", "canvas",
]);

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);

function isButtonishOpenTag(tagHtml: string, tag: string): boolean {
  if (tag === "button") return true;
  return /\bdata-elem-type\s*=\s*(["'])button\1/i.test(tagHtml) ||
    /\brole\s*=\s*(["'])button\1/i.test(tagHtml) ||
    /\bclass\s*=\s*(["'])[^"']*(?:\bt-btn\b|\bbtn\b|button|t-submit)[^"']*\1/i.test(tagHtml);
}

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
  let skipTag: string | null = null;
  const openStack: Array<{ tag: string; isButton: boolean }> = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("<")) {
      const tagMatch = part.match(/^<\/?\s*([a-zA-Z0-9]+)/);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        const isClosing = /^<\//.test(part);
        if (skipTag) {
          if (tag === skipTag && isClosing) skipTag = null;
        } else if (isClosing) {
          const idx = openStack.map((entry) => entry.tag).lastIndexOf(tag);
          if (idx >= 0) openStack.splice(idx);
        } else if (SKIP_TAGS.has(tag) && !part.endsWith("/>")) {
          skipTag = tag;
        } else if (!VOID_TAGS.has(tag) && !part.endsWith("/>")) {
          openStack.push({ tag, isButton: isButtonishOpenTag(part, tag) });
        }
      }
      continue;
    }
    if (skipTag) continue;
    const raw = part;
    const trimmed = raw.trim();
    if (trimmed.length < MIN_LEN) continue;
    // Skip if it's just punctuation / numbers
    if (!/[a-zA-Zа-яА-Я]/.test(trimmed)) continue;
    if (segments.length >= MAX_SEGMENTS) continue;
    const id = nextId++;
    const kind: Segment["kind"] = openStack.some((entry) => entry.isButton) ? "button" : "text";
    segments.push({ id, kind, text: trimmed });
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
      seg.kind === "text" || seg.kind === "button"
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

/**
 * Guard visual-builder layouts from AI copy expansion. Builders like Tilda use
 * absolutely-positioned text boxes, so a short heading becoming a longer phrase
 * can overlap the next block. Prefer a clean original label over broken layout.
 */
export function constrainRewritesForLayout(
  segments: Segment[],
  rewritten: Record<number, string>,
): Record<number, string> {
  const safe: Record<number, string> = {};
  const visualWeight = (s: string) => Array.from(s).reduce((sum, ch) => {
    if (/\s/.test(ch)) return sum + 0.45;
    if (/[ilI1|'`.,:;!]/.test(ch)) return sum + 0.45;
    if (/[mwMW@#%&А-Я]/.test(ch)) return sum + 1.25;
    return sum + 1;
  }, 0);
  const clampToBudget = (value: string, maxChars: number, maxWeight: number) => {
    let out = "";
    for (const ch of Array.from(value)) {
      const next = `${out}${ch}`;
      if (Array.from(next).length > maxChars || visualWeight(next) > maxWeight) break;
      out = next;
    }
    return out.replace(/[\s,;:—-]+$/g, "").trim();
  };
  for (const seg of segments) {
    const value = rewritten[seg.id];
    if (typeof value !== "string") continue;
    const compact = value.replace(/\s+/g, " ").trim();
    if (!compact) continue;

    const original = seg.text.replace(/\s+/g, " ").trim();
    const len = Array.from(original).length;
    // Hard layout preservation: keep the visual footprint close to the
    // original, because scraped builders use fixed-position text boxes.
    const max =
      seg.kind === "button" ? Math.max(len + 2, Math.ceil(len * 1.08)) :
      seg.kind === "title" ? Math.max(len + 6, Math.ceil(len * 1.12)) :
      seg.kind === "meta-description" ? Math.max(len + 12, Math.ceil(len * 1.18)) :
      seg.kind === "alt" || seg.kind === "aria-label" ? Math.max(len + 4, Math.ceil(len * 1.1)) :
      len <= 12 ? len :
      len <= 25 ? Math.max(len + 2, Math.ceil(len * 1.08)) :
      len <= 60 ? Math.max(len + 4, Math.ceil(len * 1.1)) :
      len <= 140 ? Math.max(len + 10, Math.ceil(len * 1.15)) :
      Math.max(len + 24, Math.ceil(len * 1.18));
    const maxWeight = visualWeight(original) * (
      len <= 12 || seg.kind === "button" ? 1.02 :
      len <= 60 ? 1.08 :
      1.14
    );

    safe[seg.id] = clampToBudget(compact, max, maxWeight) || original;
  }
  return safe;
}

/**
 * Make scraped visual builders render as a static document inside a sandboxed iframe.
 * Many builders (notably Tilda) ship HTML that is invisible until their JS adds
 * `*_visible` / animation classes and swaps lazy image attributes into `src`.
 */
export function prepareStaticPreviewHtml(html: string, sourceUrl: string): string {
  const safeUrl = sourceUrl.replaceAll('"', "&quot;");
  let out = html
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/<style\b[^>]*id=["']liketony-[^"']*["'][\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*id=["']liketony-[^"']*["'][\s\S]*?<\/script>/gi, "");

  out = out.replace(
    /<img\b([^>]*?)\bdata-original\s*=\s*("([^"]*)"|'([^']*)')([^>]*)>/gi,
    (match, before, _quoted, dq, sq, after) => {
      const url = dq ?? sq ?? "";
      const attrs = `${before}${after}`;
      const withSrc = /\ssrc\s*=/i.test(attrs)
        ? match.replace(/\ssrc\s*=\s*("[^"]*"|'[^']*')/i, ` src="${url}"`)
        : `<img${before} src="${url}" data-original="${url}"${after}>`;
      return /\bloading\s*=/i.test(withSrc) ? withSrc : withSrc.replace(/<img\b/i, '<img loading="lazy"');
    },
  );

  out = out.replace(
    /<(source|img)\b([^>]*?)\bdata-originalset\s*=\s*("([^"]*)"|'([^']*)')([^>]*)>/gi,
    (match, tag, before, _quoted, dq, sq, after) => {
      const value = dq ?? sq ?? "";
      return /\ssrcset\s*=/i.test(`${before}${after}`)
        ? match.replace(/\ssrcset\s*=\s*("[^"]*"|'[^']*')/i, ` srcset="${value}"`)
        : `<${tag}${before} srcset="${value}" data-originalset="${value}"${after}>`;
    },
  );

  out = out.replace(
    /<([a-z][\w:-]*)\b([^>]*?)\bdata-original\s*=\s*("([^"]*)"|'([^']*)')([^>]*)>/gi,
    (match, tag, before, _quoted, dq, sq, after) => {
      if (tag.toLowerCase() === "img") return match;
      const url = dq ?? sq ?? "";
      if (!/\bt-bgimg\b|\bdata-original\b/i.test(match) || /background-image\s*:/i.test(match)) return match;
      const styleMatch = match.match(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
      const bg = `background-image:url('${url.replaceAll("'", "%27")}')`;
      if (styleMatch) {
        const current = styleMatch[2] ?? styleMatch[3] ?? "";
        return match.replace(styleMatch[0], ` style="${bg};${current}"`);
      }
      return match.replace(/>$/, ` style="${bg};">`);
    },
  );

  const previewHead = `<base href="${safeUrl}"><style id="liketony-static-preview-fix">
html,body{min-width:0!important;max-width:100%!important;overflow-x:hidden!important;}
.t-records,.t-records_animated,.t-records.t-records_visible{opacity:1!important;}
.t-animate,[data-animate-style],[data-animate-style-res-320],[data-animate-style-res-360],[data-animate-style-res-480],[data-animate-style-res-640],[data-animate-style-res-960]{opacity:1!important;transform:none!important;transition:none!important;}
.t396__artboard,.t396__carrier,.t396__filter{overflow:hidden!important;}
img[data-original]{visibility:visible!important;opacity:1!important;}
</style><script id="liketony-text-fit">
(function(){
  function each(list,fn){Array.prototype.forEach.call(list,fn);}
  function normalizeTildaRuntime(){
    each(document.querySelectorAll('.t396__elem[style]'),function(el){
      ['top','left','right','bottom','width','height','transform','transition','transition-duration'].forEach(function(prop){el.style.removeProperty(prop);});
      if(!el.getAttribute('style')) el.removeAttribute('style');
    });
  }
  function fitText(){
    normalizeTildaRuntime();
    each(document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom'),function(atom){
      atom.style.removeProperty('font-size');
      atom.removeAttribute('data-ps-fit-font');
    });
  }
  document.addEventListener('DOMContentLoaded',fitText);
  window.addEventListener('load',function(){fitText();setTimeout(fitText,400);setTimeout(fitText,1500);});
  window.addEventListener('resize',function(){clearTimeout(window.__psFitT);window.__psFitT=setTimeout(fitText,150);});
})();
</script>`;

  return /<head[^>]*>/i.test(out)
    ? out.replace(/<head[^>]*>/i, (m) => `${m}${previewHead}`)
    : `<head>${previewHead}</head>${out}`;
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
