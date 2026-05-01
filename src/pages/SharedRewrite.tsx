import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Download, ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Rewrite {
  source_url: string;
  persona_name: string;
  persona_id: string;
  html_rewritten: string;
  html_original: string;
  created_at: string;
}

const SharedRewrite = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [data, setData] = useState<Rewrite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"rewritten" | "original">("rewritten");

  useEffect(() => {
    if (!publicId) return;
    document.title = "PersonaSwap — Shared rewrite";
    (async () => {
      const { data, error } = await supabase
        .from("rewrites")
        .select("source_url, persona_name, persona_id, html_rewritten, html_original, created_at")
        .eq("public_id", publicId)
        .maybeSingle();
      if (error || !data) {
        setError("This rewrite was not found.");
        return;
      }
      setData(data as Rewrite);
      document.title = `${data.persona_name} rewrites ${data.source_url} — PersonaSwap`;
    })();
  }, [publicId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-display text-2xl font-semibold">Not found</h1>
        <p className="text-muted-foreground">{error}</p>
        <Link to="/"><Button variant="secondary"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back home</Button></Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const previewHtml = view === "rewritten"
    ? injectBase(data.html_rewritten, data.source_url)
    : injectBase(data.html_original, data.source_url);

  const handleDownload = () => {
    const blob = new Blob([data.html_rewritten], { type: "text/html" });
    const a = document.createElement("a");
    let host = "site";
    try { host = new URL(data.source_url).hostname.replace(/\W+/g, "-"); } catch { /* noop */ }
    a.href = URL.createObjectURL(blob);
    a.download = `${host}-${data.persona_id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b border-border/60 bg-card/40 backdrop-blur flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> PersonaSwap
          </Link>
          <span className="text-sm text-muted-foreground truncate">
            <span className="text-foreground font-medium">{data.persona_name}</span> rewrites{" "}
            <span className="text-foreground">{data.source_url}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border/60 p-0.5 flex bg-card/60">
            {(["rewritten", "original"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={
                  "px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors " +
                  (view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1.5" /> Download HTML
          </Button>
          <a href={data.source_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
          </a>
        </div>
      </header>
      <iframe
        key={view}
        title="Shared rewrite"
        srcDoc={previewHtml}
        sandbox="allow-same-origin allow-scripts allow-popups"
        className="flex-1 w-full bg-white"
      />
    </div>
  );
};

function injectBase(html: string, url: string): string {
  const safeUrl = url.replaceAll('"', "&quot;");
  const previewHead = `<base href="${safeUrl}"><style id="personaswap-static-preview-fix">
html,body{min-width:0!important;}
.t-records,.t-records_animated,.t-records.t-records_visible{opacity:1!important;}
.t-animate,[data-animate-style],[data-animate-style-res-320],[data-animate-style-res-360],[data-animate-style-res-480],[data-animate-style-res-640],[data-animate-style-res-960]{opacity:1!important;transform:none!important;transition:none!important;}
.t396__artboard,.t396__carrier,.t396__filter{overflow:visible!important;}
img[data-original]{visibility:visible!important;opacity:1!important;}
</style>`;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`)
    : `<head>${previewHead}</head>${html}`;
}

export default SharedRewrite;
