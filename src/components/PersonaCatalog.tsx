import { useMemo, useState } from "react";
import { Search, Sparkles, Loader2, TrendingUp } from "lucide-react";
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
}

export function PersonaCatalog({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<PersonaCategory | "all">("all");
  const [customLoading, setCustomLoading] = useState(false);
  const [customName, setCustomName] = useState("");
  const usage = usePersonaUsage();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PERSONAS.filter((p) => {
      if (activeCat !== "all" && p.category !== activeCat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.shortBio.toLowerCase().includes(q);
    });
  }, [query, activeCat]);

  const handleCustom = async () => {
    const name = customName.trim();
    if (name.length < 2) {
      toast.error("Enter a name (at least 2 characters)");
      return;
    }
    setCustomLoading(true);
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
      setCustomLoading(false);
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
        <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Or type any name..."
            className="bg-card/60 border-border/60"
            onKeyDown={(e) => e.key === "Enter" && handleCustom()}
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

      <div className="flex flex-col gap-1.5">
        {filtered.map((p) => {
          const count = usage[p.id] ?? 0;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={cn(
                "group text-left rounded-xl border px-3 py-2.5 transition-all bg-card/40 hover:bg-card/80 flex items-center gap-3",
                selectedId === p.id
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
                  <TrendingUp className="w-3 h-3" />
                  {count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-10 text-sm">
            No personas match. Try a different search or add a custom one above.
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryPill({
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
}
