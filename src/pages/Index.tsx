import { useState } from "react";
import { Sparkles } from "lucide-react";
import { DomainBar } from "@/components/DomainBar";
import { PersonaCatalog } from "@/components/PersonaCatalog";
import { Workspace } from "@/components/Workspace";
import { Persona, PERSONAS_BY_ID } from "@/data/personas";
import { toast } from "sonner";

const DEFAULT_PERSONA_ID = "hormozi";

const Index = () => {
  const [url, setUrl] = useState("");
  const [persona, setPersona] = useState<Persona>(PERSONAS_BY_ID[DEFAULT_PERSONA_ID]);
  const [active, setActive] = useState<{ url: string; persona: Persona } | null>(null);

  const handleGo = (newUrl: string) => {
    if (!newUrl.trim()) {
      toast.error("Enter a domain first");
      return;
    }
    if (!persona) {
      toast.error("Pick a persona");
      return;
    }
    setUrl(newUrl);
    setActive({ url: newUrl, persona });
  };

  if (active) {
    return (
      <Workspace
        initialUrl={active.url}
        initialPersona={active.persona}
        onClose={() => setActive(null)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] flex items-center justify-center shadow-glow">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">PersonaPress</span>
        </div>
        <a
          href="https://docs.lovable.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Built on Lovable
        </a>
      </header>

      <main className="max-w-6xl mx-auto px-6 sm:px-10 pt-10 pb-24 space-y-14">
        <section className="text-center space-y-6 max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/40 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Rewrite any landing page in any voice
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold leading-[1.05] tracking-tight">
            Your landing,{" "}
            <span className="text-gradient">in their voice.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Drop in your domain, pick a persona — from Hormozi to Hemingway, Jobs to Carlin —
            and watch your copy get rewritten in their unmistakable voice. Preview, download, share.
          </p>
          <div className="max-w-2xl mx-auto pt-4">
            <DomainBar defaultUrl={url} onSubmit={handleGo} />
            {persona && (
              <p className="text-xs text-muted-foreground mt-3">
                Selected:{" "}
                <span className="text-foreground font-medium">{persona.name}</span> ·{" "}
                <span className="italic">{persona.shortBio}</span>
              </p>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">Pick a persona</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Hundreds of voices, organized by category. Or type any name and we'll generate one.
              </p>
            </div>
          </div>
          <PersonaCatalog selectedId={persona?.id} onSelect={setPersona} />
        </section>
      </main>
    </div>
  );
};

export default Index;
