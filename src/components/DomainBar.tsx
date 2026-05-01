import { useState, FormEvent } from "react";
import { Globe, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  defaultUrl?: string;
  onSubmit: (url: string) => void;
  disabled?: boolean;
  loading?: boolean;
  ctaLabel?: string;
}

export function DomainBar({ defaultUrl = "", onSubmit, disabled, loading, ctaLabel = "Go" }: Props) {
  const [value, setValue] = useState(defaultUrl);

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
  };

  return (
    <form onSubmit={handle} className="w-full">
      <div className="relative flex items-center gap-2 bg-card/60 backdrop-blur border border-border/60 rounded-2xl p-2 shadow-card focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
        <Globe className="w-5 h-5 text-muted-foreground ml-3" />
        <Input
          type="text"
          inputMode="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="example.com"
          disabled={disabled}
          className="border-0 bg-transparent text-base md:text-lg h-12 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
        />
        <Button
          type="submit"
          disabled={disabled || loading || !value.trim()}
          className="h-11 px-5 font-display font-semibold bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 text-primary-foreground rounded-xl shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
