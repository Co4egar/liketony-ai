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
  let skipTag: string | null = null;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("<")) {
      const tagMatch = part.match(/^<\/?\s*([a-zA-Z0-9]+)/);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (skipTag) {
          if (tag === skipTag && part.startsWith("</")) skipTag = null;
        } else if (SKIP_TAGS.has(tag) && !part.startsWith("</") && !part.endsWith("/>")) {
          skipTag = tag;
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
  for (const seg of segments) {
    const value = rewritten[seg.id];
    if (typeof value !== "string") continue;
    const compact = value.replace(/\s+/g, " ").trim();
    if (!compact) continue;

    const original = seg.text.replace(/\s+/g, " ").trim();
    const len = Array.from(original).length;
    const max =
      seg.kind !== "text" ? Math.ceil(len * 1.10) + 2 :
      len <= 18 ? len + 2 :
      len <= 40 ? Math.ceil(len * 1.08) + 2 :
      len <= 90 ? Math.ceil(len * 1.10) + 3 :
      Math.ceil(len * 1.15);

    safe[seg.id] = Array.from(compact).length <= max ? compact : original;
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
  let out = html.replace(/<base\b[^>]*>/gi, "");

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

  const previewHead = `<base href="${safeUrl}"><style id="personaswap-static-preview-fix">
html,body{min-width:0!important;max-width:100%!important;overflow-x:hidden!important;}
body{word-spacing:normal!important;letter-spacing:normal!important;}
.t-records,.t-records_animated,.t-records.t-records_visible{opacity:1!important;}
.t-animate,[data-animate-style],[data-animate-style-res-320],[data-animate-style-res-360],[data-animate-style-res-480],[data-animate-style-res-640],[data-animate-style-res-960]{opacity:1!important;transform:none!important;transition:none!important;}
.t396__artboard,.t396__carrier,.t396__filter{overflow:hidden!important;}
img[data-original]{visibility:visible!important;opacity:1!important;}
p,h1,h2,h3,h4,h5,h6,span,a,li{word-break:normal;overflow-wrap:break-word;hyphens:none;}
.t396__elem[data-elem-type="text"],.t396__elem[data-elem-type="button"]{box-sizing:border-box!important;}
.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom{box-sizing:border-box!important;word-spacing:normal!important;letter-spacing:0!important;word-break:normal!important;hyphens:none!important;}
</style><script id="personaswap-text-fit">
(function(){
  function fitOne(atom){
    var elem=atom.closest('.t396__elem');
    if(!elem) return;
    var css=getComputedStyle(atom);
    var fontSize=parseFloat(css.fontSize)||16;
    atom.style.wordSpacing='normal';
    atom.style.letterSpacing='0px';
    atom.style.wordBreak='normal';
    atom.style.hyphens='none';
    atom.style.overflowWrap='break-word';
    // Respect Tilda's width — never force nowrap (it caused overflow into adjacent blocks).
    if(css.whiteSpace==='nowrap') atom.style.whiteSpace='normal';
    var maxW=elem.clientWidth||elem.getBoundingClientRect().width;
    var maxH=elem.clientHeight||elem.getBoundingClientRect().height;
    if(!maxW) return;
    var minSize=Math.max(11, fontSize*0.55);
    var guard=0;
    while(guard<24 && fontSize>minSize && (atom.scrollWidth>maxW+1 || (maxH>0 && atom.scrollHeight>maxH+1))){
      fontSize=fontSize*0.93;
      atom.style.fontSize=fontSize+'px';
      var lh=parseFloat(getComputedStyle(atom).lineHeight);
      if(!isNaN(lh) && lh>fontSize*1.6) atom.style.lineHeight=(fontSize*1.2)+'px';
      guard++;
    }
  }
  function fitText(){
    var nodes=document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom');
    nodes.forEach(fitOne);
  }
  document.addEventListener('DOMContentLoaded',fitText);
  window.addEventListener('load',function(){fitText();setTimeout(fitText,300);setTimeout(fitText,1200);});
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
