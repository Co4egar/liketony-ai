import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
  Share2,
  RefreshCw,
  ChevronLeft,
  Check,
} from "lucide-react";
import { Persona } from "@/data/personas";
import { Button } from "@/components/ui/button";
import { PersonaAvatar } from "./PersonaAvatar";
import { DomainBar } from "./DomainBar";
import { PersonaCatalog } from "./PersonaCatalog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RewriteResult } from "@/types/rewrite";
import { enhancePreviewHtml } from "@/lib/preview-html";
import { usePersonaUsage } from "@/hooks/usePersonaUsage";
import { getPersonaStages } from "@/lib/persona-stages";
import { TrendingUp } from "lucide-react";

interface Props {
  initialUrl: string;
  initialPersona: Persona;
  onClose: () => void;
}

const FALLBACK_STAGES = [
  "Fetching site",
  "Extracting copy",
  "Rewriting in voice",
  "Rendering preview",
] as const;

export const Workspace = forwardRef<HTMLDivElement, Props>(function Workspace(
  { initialUrl, initialPersona, onClose },
  ref,
) {
  const [url, setUrl] = useState(initialUrl);
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [intensity, setIntensity] = useState(50);
  const [pending, setPending] = useState<{ url: string; persona: Persona; intensity: number } | null>({
    url: initialUrl,
    persona: initialPersona,
    intensity: 50,
  });
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"rewritten" | "original">("rewritten");
  const [changingPersona, setChangingPersona] = useState(false);
  const reqRef = useRef(0);
  const usage = usePersonaUsage();
  const personaCount = usage[persona.id] ?? 0;

  const loading = pending !== null;

  useEffect(() => {
    if (!pending) return;
    const myReq = ++reqRef.current;
    setError(null);
    setResult(null);
    setStage(0);

    const stageTimers = [800, 1800].map((delay, i) =>
      window.setTimeout(() => {
        if (reqRef.current === myReq) setStage(i + 1);
      }, delay),
    );

    (async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("process-site", {
          body: {
            url: pending.url,
            intensity: pending.intensity,
            persona: {
              id: pending.persona.id,
              name: pending.persona.name,
              voicePrompt: pending.persona.voicePrompt,
              signaturePhrases: pending.persona.signaturePhrases,
              tone: pending.persona.tone,
              rhythm: pending.persona.rhythm,
              vocabulary: pending.persona.vocabulary,
              signatureMoves: pending.persona.signatureMoves,
              taboos: pending.persona.taboos,
              accent: pending.persona.accent,
              verbalTics: pending.persona.verbalTics,
              examples: pending.persona.examples,
            },
          },
        });
        if (reqRef.current !== myReq) return;
        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);
        setStage(3);
        setResult(data as RewriteResult);
        setView("rewritten");
      } catch (e) {
        if (reqRef.current !== myReq) return;
        setError(e instanceof Error ? e.message : "Something went wrong");
        toast.error(e instanceof Error ? e.message : "Failed to rewrite landing");
      } finally {
        if (reqRef.current === myReq) setPending(null);
        stageTimers.forEach(clearTimeout);
      }
    })();

    return () => stageTimers.forEach(clearTimeout);
  }, [pending]);

  const goAgain = (newUrl?: string, newPersona?: Persona, newIntensity?: number) => {
    const targetUrl = newUrl ?? url;
    const targetPersona = newPersona ?? persona;
    const targetIntensity = newIntensity ?? intensity;
    setUrl(targetUrl);
    setPersona(targetPersona);
    setChangingPersona(false);
    setPending({ url: targetUrl, persona: targetPersona, intensity: targetIntensity });
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.htmlRewritten], { type: "text/html" });
    const a = document.createElement("a");
    const safeHost = (() => {
      try { return new URL(result.url).hostname.replace(/\W+/g, "-"); } catch { return "site"; }
    })();
    a.href = URL.createObjectURL(blob);
    a.download = `${safeHost}-${persona.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const handleShare = async () => {
    if (!result) return;
    const link = `${window.location.origin}/r/${result.publicId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.message(link);
    }
  };

  const previewSrc = useMemo(() => {
    if (!result) return "";
    const html = view === "rewritten"
      ? result.htmlPreview
      : (result.htmlOriginalPreview ?? result.htmlOriginal);
    return enhancePreviewHtml(html, result.url);
  }, [result, view]);

  return (
    <div ref={ref} className="fixed inset-0 z-30 flex bg-background animate-fade-in">
      {/* Sidebar */}
      <aside className="w-full sm:w-[340px] border-r border-border/60 bg-card/40 backdrop-blur flex flex-col">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> Home
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-[10px] leading-none">L</span>
            </div>
            <span className="text-xs text-foreground font-display font-semibold">LikeTony.ai</span>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto scrollbar-thin flex-1">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Domain</label>
            <DomainBar
              defaultUrl={url}
              onSubmit={(v) => goAgain(v, persona)}
              loading={loading}
              ctaLabel="Go again"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Persona</label>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setChangingPersona((v) => !v)}
              >
                {changingPersona ? "Cancel" : "Change"}
              </button>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/60 p-3 flex items-center gap-3">
              <PersonaAvatar persona={persona} />
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold truncate">{persona.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{persona.shortBio}</div>
              </div>
              {personaCount > 0 && (
                <span
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums"
                  title={`Used ${personaCount.toLocaleString()} times across all sites`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {personaCount.toLocaleString()}
                </span>
              )}
            </div>
            <div className="rounded-xl border border-border/60 bg-card/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>Chill</span>
                <span className="text-foreground font-medium normal-case tracking-normal">{intensity}%</span>
                <span>Aggressive</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                onMouseUp={() => intensity !== pending?.intensity && goAgain(url, persona, intensity)}
                onTouchEnd={() => intensity !== pending?.intensity && goAgain(url, persona, intensity)}
                onKeyUp={(e) => { if (e.key === "Enter") goAgain(url, persona, intensity); }}
                disabled={loading}
                className="w-full accent-primary h-1.5 cursor-pointer disabled:opacity-50"
                aria-label="Tone intensity from chill to aggressive"
              />
              <div className="text-[11px] text-muted-foreground">
                Higher = more aggressive, sales-driven copy.
              </div>
            </div>
          </div>

          {changingPersona && (
            <div className="-mx-4 px-4 pt-2 border-t border-border/60">
              <PersonaCatalog
                selectedId={persona.id}
                onSelect={(p) => goAgain(url, p)}
                layout="list"
              />
            </div>
          )}

          {result && !changingPersona && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Button onClick={handleDownload} className="w-full justify-start gap-2" variant="secondary">
                <Download className="w-4 h-4" /> Download HTML
              </Button>
              <Button onClick={handleShare} variant="secondary" className="w-full justify-start gap-2">
                <Share2 className="w-4 h-4" /> Copy share link
              </Button>
              <Button
                onClick={() => goAgain()}
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-4 h-4" /> Run again
              </Button>
              <div className="text-xs text-muted-foreground pt-2">
                Rewrote {result.rewrittenCount} / {result.segmentCount} segments.
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Workspace */}
      <main className="flex-1 hidden sm:flex flex-col bg-background relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <PersonaAvatar persona={pending!.persona} size="lg" />
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
              <div className="space-y-1.5 min-w-[280px]">
                {getPersonaStages(pending!.persona).map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 text-sm transition-colors",
                      i < stage ? "text-foreground" : i === stage ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {i < stage ? (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    ) : i === stage ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                    )}
                    <span className="leading-snug">{s}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">— {pending!.persona.name}</div>
            </div>
          </div>
        )}

        {/* removed FALLBACK_STAGES sentinel */}
        {false && FALLBACK_STAGES.length}

        {error && !loading && (
          <div className="m-auto max-w-md text-center p-6 rounded-xl border border-destructive/40 bg-destructive/10">
            <div className="font-display font-semibold mb-2">Couldn't rewrite this site</div>
            <div className="text-sm text-muted-foreground mb-4">{error}</div>
            <Button onClick={() => goAgain()} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Try again
            </Button>
          </div>
        )}

        {result && (
          <>
            <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between gap-4 bg-card/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-sm text-muted-foreground truncate">{result.url}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-border/60 p-0.5 flex bg-card/60">
                  {(["rewritten", "original"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={cn(
                        "px-3 py-1 text-xs rounded-md font-medium transition-colors capitalize",
                        view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([previewSrc], { type: "text/html" });
                    window.open(URL.createObjectURL(blob), "_blank");
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <PreviewFrame key={`${view}-${result.publicId}`} srcDoc={previewSrc} />
          </>
        )}
      </main>
    </div>
  );
});

const BASE_W = 1440;

function PreviewFrame({ srcDoc }: { srcDoc: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [contentH, setContentH] = useState(900);

  useEffect(() => {
    const fit = () => {
      const w = wrapRef.current?.clientWidth ?? BASE_W;
      setScale(Math.min(1, w / BASE_W));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Measure inner iframe document height.
  const measure = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const h = Math.max(
      doc.documentElement?.scrollHeight ?? 0,
      doc.body?.scrollHeight ?? 0,
      900,
    );
    setContentH(h);
  };

  useEffect(() => {
    const id = window.setInterval(measure, 600);
    return () => window.clearInterval(id);
  }, [srcDoc]);

  return (
    <div ref={wrapRef} className="flex-1 overflow-auto bg-white">
      <div
        ref={innerRef}
        style={{
          width: `${BASE_W * scale}px`,
          height: `${contentH * scale}px`,
          position: "relative",
        }}
      >
        <iframe
          ref={iframeRef}
          title="Preview"
          srcDoc={srcDoc}
          sandbox="allow-same-origin allow-scripts allow-popups"
          onLoad={measure}
          style={{
            width: `${BASE_W}px`,
            height: `${contentH}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: 0,
            display: "block",
            background: "white",
          }}
        />
      </div>
    </div>
  );
}

