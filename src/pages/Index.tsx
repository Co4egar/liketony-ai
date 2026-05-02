import { useState } from "react";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { DomainBar } from "@/components/DomainBar";
import { PersonaCatalog } from "@/components/PersonaCatalog";
import { PersonaAvatar } from "@/components/PersonaAvatar";
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
      toast.error("Drop a domain. That's the whole game.");
      return;
    }
    if (!persona) {
      toast.error("Pick a voice first.");
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
    <div className="min-h-screen relative">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-border/40">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shadow-warm">
            <span className="font-display font-bold text-primary-foreground text-lg leading-none">L</span>
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">
            LikeTony<span className="text-primary">.ai</span>
          </span>
        </a>
        <nav className="flex items-center gap-3">
          <Link
            to="/why-it-matters"
            className="px-3.5 py-1.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-card/60 transition-colors"
          >
            Why it matters
          </Link>
        </nav>
      </header>

      <main className="relative">
        <section id="start" className="px-6 sm:px-10 pt-8 pb-6 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Landing-page rewriter · live in 60 sec
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.0] tracking-[-0.03em] max-w-4xl">
            Your landing page is{" "}
            <em className="italic font-normal text-coral">leaving money</em>{" "}
            on the table.
          </h1>

          <div className="mt-6 grid lg:grid-cols-[1fr_auto] gap-4 items-stretch">
            <div className="space-y-2">
              <DomainBar defaultUrl={url} onSubmit={handleGo} ctaLabel="Rewrite it" />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> No signup</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Download HTML</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Free to try</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 min-w-0 lg:min-w-[280px]">
              <PersonaAvatar persona={persona} size="lg" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Voice selected
                </div>
                <div className="font-display font-semibold text-lg leading-tight truncate">
                  {persona.name}
                </div>
                <div className="text-xs text-muted-foreground truncate italic">
                  {persona.shortBio}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="voices" className="px-6 sm:px-10 pt-2 pb-16 max-w-6xl mx-auto">
          <PersonaCatalog selectedId={persona?.id} onSelect={setPersona} />
        </section>

        <footer className="px-6 sm:px-10 py-10 border-t border-border/60 mt-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-[10px] leading-none">L</span>
              </div>
              <span className="font-display font-semibold text-foreground">LikeTony.ai</span>
              <span>· Your landing, in their voice.</span>
            </div>
            <Link to="/why-it-matters" className="hover:text-foreground transition-colors">
              Why it matters →
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
