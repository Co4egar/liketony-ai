import { useEffect, useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SellingScore } from "@/types/rewrite";

interface Props {
  before: SellingScore;
  after: SellingScore;
  defaultOpen?: boolean;
  className?: string;
}

const AXIS_LABELS: Record<keyof SellingScore["axes"], string> = {
  clarity: "Clarity of value",
  specificity: "Specificity",
  outcome: "Outcome focus",
  cta: "CTA strength",
  voice: "Voice & tension",
};

function useCounter(target: number, durationMs = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return v;
}

function Bar({ value, tone = "muted" }: { value: number; tone?: "muted" | "primary" }) {
  // value 0..20 → percent
  const pct = Math.max(0, Math.min(100, (value / 20) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
      <div
        className={cn(
          "h-full transition-[width] duration-700 ease-out",
          tone === "primary" ? "bg-primary" : "bg-muted-foreground/50",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SellingScoreCard({ before, after, defaultOpen = false, className }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const beforeAnim = useCounter(before.total);
  const afterAnim = useCounter(after.total);
  const delta = after.total - before.total;
  const deltaSign = delta > 0 ? "+" : "";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-warm",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground leading-none mb-1">
            Selling power
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground tabular-nums">{beforeAnim}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-display font-semibold text-base text-foreground tabular-nums">
              {afterAnim}
              <span className="text-xs text-muted-foreground">/100</span>
            </span>
            <span
              className={cn(
                "ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tabular-nums",
                delta > 0
                  ? "bg-primary/15 text-primary"
                  : delta < 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {deltaSign}
              {delta}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/60 animate-fade-in">
          {(Object.keys(AXIS_LABELS) as Array<keyof SellingScore["axes"]>).map((k) => {
            const b = before.axes[k];
            const a = after.axes[k];
            const d = a.score - b.score;
            return (
              <div key={k} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">{AXIS_LABELS[k]}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {b.score} → <span className="text-foreground">{a.score}</span>
                    <span
                      className={cn(
                        "ml-1.5",
                        d > 0
                          ? "text-primary"
                          : d < 0
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {d > 0 ? "+" : ""}
                      {d}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Bar value={b.score} tone="muted" />
                  <Bar value={a.score} tone="primary" />
                </div>
                {a.note && (
                  <p className="text-[11px] text-muted-foreground leading-snug">{a.note}</p>
                )}
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/40">
            Scored on 5 axes (0–20 each) by AI: clarity, specificity, outcome focus, CTA, voice.
          </p>
        </div>
      )}
    </div>
  );
}
