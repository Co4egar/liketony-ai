import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { enhancePreviewHtml } from "@/lib/preview-html";
import { SellingScoreCard } from "@/components/SellingScoreCard";
import { DownloadEmailGate } from "@/components/DownloadEmailGate";
import type { SellingScoreBundle } from "@/types/rewrite";

interface Rewrite {
  source_url: string;
  persona_name: string;
  persona_id: string;
  html_rewritten: string;
  html_original: string;
  selling_score: SellingScoreBundle | null;
  created_at: string;
}

const SharedRewrite = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [data, setData] = useState<Rewrite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"rewritten" | "original">("rewritten");

  useEffect(() => {
    if (!publicId) return;
    document.title = "LikeTony.ai — Shared rewrite";
    (async () => {
      const { data, error } = await supabase
        .rpc("get_rewrite_by_public_id", { p_public_id: publicId })
        .maybeSingle();
      if (error || !data) {
        setError("This rewrite was not found.");
        return;
      }
      setData(data as unknown as Rewrite);
      document.title = `${data.persona_name} rewrites ${data.source_url} — LikeTony.ai`;
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
    ? enhancePreviewHtml(data.html_rewritten, data.source_url)
    : enhancePreviewHtml(data.html_original, data.source_url);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b border-border/60 bg-card/40 backdrop-blur flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> LikeTony.ai
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
          <div className="w-[280px] max-w-[80vw]">
            {publicId && <DownloadEmailGate publicId={publicId} />}
          </div>
          <a href={data.source_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
          </a>
        </div>
      </header>
      <div className="relative flex-1">
        {data.selling_score && (
          <div className="absolute top-3 right-3 z-10 w-[300px] max-w-[calc(100%-1.5rem)]">
            <SellingScoreCard
              before={data.selling_score.before}
              after={data.selling_score.after}
              voiceFit={data.selling_score.voiceFit}
              defaultOpen
            />
          </div>
        )}
        <iframe
          key={view}
          title="Shared rewrite"
          srcDoc={previewHtml}
          sandbox="allow-same-origin allow-scripts allow-popups"
          className="absolute inset-0 w-full h-full bg-white"
        />
      </div>
    </div>
  );
};

export default SharedRewrite;
