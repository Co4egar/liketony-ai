import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Download, ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { enhancePreviewHtml } from "@/lib/preview-html";
import { toast } from "sonner";

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
  const [paying, setPaying] = useState(false);

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
      setData(data as Rewrite);
      document.title = `${data.persona_name} rewrites ${data.source_url} — LikeTony.ai`;
    })();
  }, [publicId]);

  // Show confirmation after returning from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("paid");
    if (!sessionId) return;
    if (sessionId === "cancel") {
      toast.info("Payment cancelled");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    (async () => {
      const { data: vp } = await supabase.functions.invoke("verify-payment", { body: { sessionId } });
      if (vp?.paid) {
        toast.success(
          vp.email
            ? `Payment confirmed! We've sent the HTML to ${vp.email}.`
            : "Payment confirmed! Check your email for the download link.",
          { duration: 8000 },
        );
      } else {
        toast.error("Payment not confirmed");
      }
      window.history.replaceState({}, "", window.location.pathname);
    })();
  }, []);

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

  const handleDownload = async () => {
    if (!publicId) return;
    setPaying(true);
    try {
      const { data: ck, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          publicId,
          sourceUrl: data.source_url,
          personaName: data.persona_name,
        },
      });
      if (error) throw error;
      if (!ck?.url) throw new Error("No checkout URL");
      window.location.href = ck.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start checkout");
      setPaying(false);
    }
  };

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
          <Button size="sm" variant="secondary" onClick={handleDownload} disabled={paying}>
            {paying ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            Download HTML <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">$19.99</span>
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

export default SharedRewrite;
