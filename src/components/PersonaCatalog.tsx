import { memo, useEffect, useMemo, useState } from "react";
import { Check, Search, Sparkles, Loader2, TrendingUp } from "lucide-react";
import { CATEGORIES, PERSONAS, Persona, PersonaCategory } from "@/data/personas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PersonaAvatar } from "./PersonaAvatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePersonaUsage } from "@/hooks/usePersonaUsage";

interface Props {
  selectedId?: string;
  onSelect: (persona: Persona) => void;
  layout?: "grid" | "list";
}

export function PersonaCatalog({ selectedId, onSelect, layout = "grid" }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCat, setActiveCat] = useState<PersonaCategory | "all">("all");
  const [customLoading, setCustomLoading] = useState(false);
  const [customStage, setCustomStage] = useState(0);
  const [customName, setCustomName] = useState("");
  const usage = usePersonaUsage();

  // Debounce search input to avoid filtering on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  const customStages = useMemo(
    () => [
      "Searching public sources",
      "Extracting voice patterns",
      "Building deep knowledge profile",
      "Saving for future requests",
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return PERSONAS.filter((p) => {
      if (activeCat !== "all" && p.category !== activeCat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.shortBio.toLowerCase().includes(q);
    });
  }, [debouncedQuery, activeCat]);

  const handleCustom = async () => {
    const name = customName.trim();
    if (name.length < 2) {
      toast.error("Enter a name (at least 2 characters)");
      return;
    }
    setCustomLoading(true);
    setCustomStage(0);
    const timers = [900, 2400, 4200].map((delay, i) =>
      window.setTimeout(() => setCustomStage(i + 1), delay),
    );
    try {
      const { data, error } = await supabase.functions.invoke("generate-persona", {
        body: { name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onSelect(data.persona as Persona);
      toast.success(`Created voice profile for ${data.persona.name}`);
      setCustomName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate persona");
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
      setCustomLoading(false);
      setCustomStage(0);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search personas..."
            className="pl-9 bg-card/60 border-border/60"
          />
        </div>
        <div className="w-full max-w-md space-y-2 sm:w-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Or type any name..."
              className="bg-card/60 border-border/60"
              onKeyDown={(e) => e.key === "Enter" && !customLoading && handleCustom()}
              disabled={customLoading}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCustom}
              disabled={customLoading}
            >
              {customLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
            </Button>
          </div>
          {customLoading && (
            <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-xs shadow-card animate-fade-in">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Deep research can take a moment
              </div>
              <div className="space-y-1.5">
                {customStages.map((stage, i) => (
                  <div
                    key={stage}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      i < customStage ? "text-foreground" : i === customStage ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {i < customStage ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : i === customStage ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                    )}
                    <span>{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <CategoryPill label="All" active={activeCat === "all"} onClick={() => setActiveCat("all")} />
        {CATEGORIES.map((c) => (
          <CategoryPill
            key={c.id}
            label={c.label}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
          />
        ))}
      </div>

      <ul
        className={cn(
          layout === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 list-none p-0 m-0"
            : "flex flex-col gap-1.5 list-none p-0 m-0",
        )}
        role="list"
        aria-label="Personas"
      >
        {filtered.map((p) => {
          const count = usage[p.id] ?? 0;
          const isSelected = selectedId === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                aria-pressed={isSelected}
                className={cn(
                  "group w-full text-left rounded-xl border px-3 py-2.5 transition-all bg-card/40 hover:bg-card/80 flex items-center gap-3",
                  isSelected
                    ? "border-primary/70 bg-card ring-1 ring-primary/40"
                    : "border-border/60",
                )}
              >
                <PersonaAvatar persona={p} />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold text-foreground text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{p.shortBio}</div>
                </div>
                {count > 0 && (
                  <span
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums"
                    title={`Used ${count.toLocaleString()} times`}
                  >
                    <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-center text-muted-foreground py-10 text-sm col-span-full">
            No personas match. Try a different search or add a custom one above.
          </li>
        )}
      </ul>
    </div>
  );
}

const CategoryPill = memo(function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card/40 text-muted-foreground border-border/60 hover:bg-card hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
});
