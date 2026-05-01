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
      <div className="relative flex items-center gap-2 bg-card/80 backdrop-blur border border-border rounded-lg p-1.5 shadow-card focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Globe className="w-5 h-5 text-muted-foreground ml-3" />
        <Input
          type="text"
          inputMode="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="yourdomain.com"
          disabled={disabled}
          className="border-0 bg-transparent text-base md:text-lg h-12 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 font-mono placeholder:text-muted-foreground/60"
        />
        <Button
          type="submit"
          disabled={disabled || loading || !value.trim()}
          className="h-11 px-5 font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shrink-0 gap-2"
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
