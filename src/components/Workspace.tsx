import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Check,
  ChevronDown,
} from "lucide-react";
import { Persona } from "@/data/personas";
import { Button } from "@/components/ui/button";
import { PersonaAvatar } from "./PersonaAvatar";
import { DomainBar } from "./DomainBar";
import { PersonaCatalog } from "./PersonaCatalog";
import { DownloadEmailGate } from "./DownloadEmailGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RewriteResult } from "@/types/rewrite";
import { enhancePreviewHtml } from "@/lib/preview-html";
import { usePersonaUsage } from "@/hooks/usePersonaUsage";
import { getPersonaStages } from "@/lib/persona-stages";
import { TrendingUp } from "lucide-react";
import { SellingScoreCard } from "./SellingScoreCard";

interface Props {
  initialUrl: string;
  initialPersona: Persona;
  onClose: () => void;
}


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
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

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
              knowledgeBase: pending.persona.knowledgeBase,
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
    setOptimized(false);
    setPending({ url: targetUrl, persona: targetPersona, intensity: targetIntensity });
  };

  const handleOptimize = async () => {
    if (!result) return;
    setOptimizing(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("process-site", {
        body: { url: result.url, intensity: 70, mode: "optimize" },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setResult(data as RewriteResult);
      setView("rewritten");
      setOptimized(true);
      toast.success("Tony Bot optimized your page for max conversion");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setOptimizing(false);
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
    <div ref={ref} className="fixed inset-0 z-30 flex flex-col sm:flex-row bg-background animate-fade-in">
      {/* Sidebar */}
      <aside className={cn(
        "w-full sm:w-[340px] sm:h-full sm:max-h-none border-b sm:border-b-0 sm:border-r border-border/60 bg-card/40 backdrop-blur flex flex-col shrink-0",
        mobileExpanded ? "max-h-[70vh]" : "max-h-none",
      )}>
        <div className="p-4 border-b border-border/60 flex items-center justify-between gap-2">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> Home
          </button>
          <button
            type="button"
            onClick={() => setMobileExpanded((v) => !v)}
            className="sm:hidden flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md border border-border/60"
            aria-expanded={mobileExpanded}
          >
            {mobileExpanded ? "Hide options" : "Show options"}
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", mobileExpanded && "rotate-180")} />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-[10px] leading-none">L</span>
            </div>
            <span className="text-xs text-foreground font-display font-semibold">LikeTony.ai</span>
          </div>
        </div>

        <div className={cn(
          "p-4 space-y-4 overflow-y-auto scrollbar-thin flex-1",
          mobileExpanded ? "block" : "hidden sm:block",
        )}>
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
            {result?.sellingScore && !changingPersona && (
              <SellingScoreCard
                before={result.sellingScore.before}
                after={result.sellingScore.after}
                voiceFit={result.sellingScore.voiceFit}
              />
            )}
            {result?.sellingScore && !changingPersona && !optimized && (() => {
              const after = result.sellingScore.after.total;
              const pred = result.sellingScore.predictedOptimized;
              if (!pred) return null;
              const minGain = Math.max(0, pred.min - after);
              const expectedGain = Math.max(minGain, pred.expected - after);
              if (expectedGain < 2) return null;
              return (
                <Button
                  onClick={handleOptimize}
                  disabled={optimizing || loading}
                  variant="secondary"
                  className="w-full h-auto min-h-10 py-2 justify-center gap-2 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-foreground whitespace-normal text-center leading-snug"
                  title={pred.reasoning || undefined}
                >
                  {optimizing && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  <span className="break-words">
                    {optimizing
                      ? "Tony Bot is rewriting…"
                      : `Tony Bot: boost Selling Power ~+${expectedGain}${minGain > 0 && minGain < expectedGain ? ` (min +${minGain})` : ""}`}
                  </span>
                </Button>
              );
            })()}
            {result && !changingPersona && (
              <DownloadEmailGate publicId={result.publicId} />
            )}
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
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/60">
              Rewrote {result.rewrittenCount} / {result.segmentCount} segments.
            </div>
          )}
        </div>
      </aside>

      {/* Mobile sticky Download CTA */}
      {result && !changingPersona && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-background via-background/95 to-background/0 pointer-events-none">
          <div className="pointer-events-auto">
            <DownloadEmailGate publicId={result.publicId} />
          </div>
        </div>
      )}


      {/* Workspace */}
      <main className="flex-1 min-h-[300px] flex flex-col bg-background relative overflow-hidden">
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
                <div className="rounded-xl border border-border/60 p-1 flex bg-card/60">
                  {(["rewritten", "original"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={cn(
                        "px-5 py-2 text-sm rounded-lg font-semibold transition-all capitalize shadow-sm",
                        view === v
                          ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent",
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

  // Measure inner iframe document height. Cap to prevent vh-based feedback loops.
  const MAX_H = 20000;
  const measure = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    // Temporarily neutralize iframe height influence so body reports its natural size.
    const iframe = iframeRef.current!;
    const prevH = iframe.style.height;
    iframe.style.height = "0px";
    // Force reflow
    void doc.body?.offsetHeight;
    const h = Math.min(
      MAX_H,
      Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0,
        900,
      ),
    );
    iframe.style.height = prevH;
    setContentH((prev) => (Math.abs(prev - h) > 4 ? h : prev));
  };

  // Observe iframe content for size changes instead of polling on an interval.
  const handleIframeLoad = () => {
    // Defer initial measure so layout settles.
    setTimeout(measure, 50);
    setTimeout(measure, 400);
    setTimeout(measure, 1200);
  };

  useEffect(() => {
    return () => {
      const ro = (iframeRef.current as any)?._ro as ResizeObserver | undefined;
      ro?.disconnect();
    };
  }, []);

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
          loading="lazy"
          onLoad={handleIframeLoad}
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

