import { useState } from "react";
import { Check, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import { DomainBar } from "@/components/DomainBar";
import { PersonaCatalog } from "@/components/PersonaCatalog";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { Workspace } from "@/components/Workspace";
import { Persona, PERSONAS_BY_ID, PERSONAS } from "@/data/personas";
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
        <section id="start" className="px-6 sm:px-10 pt-20 pb-24 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Landing-page rewriter · live in 60 sec
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium leading-[0.98] tracking-[-0.03em]">
                Your landing page is{" "}
                <em className="italic font-normal text-coral">leaving money</em>{" "}
                on the table.
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Look — most landing pages don't have a copy problem. They have a{" "}
                <span className="text-foreground font-medium">voice</span> problem.
                Boring voice, boring conversions. Drop your URL. Pick a voice that
                actually sells. Watch your page rewrite itself in 60 seconds. That's it.
              </p>

              <div className="space-y-3">
                <DomainBar defaultUrl={url} onSubmit={handleGo} ctaLabel="Rewrite it" />
                <p className="text-xs text-muted-foreground font-mono">
                  Selected voice:{" "}
                  <span className="text-foreground">{persona.name}</span> ·{" "}
                  <span className="italic">{persona.shortBio}</span> ·{" "}
                  <a href="#voices" className="text-primary hover:underline">
                    swap →
                  </a>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> No signup</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Download HTML</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Free to try</span>
              </div>
            </div>

            <aside className="lg:col-span-5 lg:sticky lg:top-8 animate-fade-in">
              <div className="relative rounded-xl border border-border bg-card/60 backdrop-blur p-7 shadow-card grain overflow-hidden">
                <Quote className="w-6 h-6 text-primary mb-4" />
                <p className="font-display text-2xl leading-snug text-foreground">
                  "If your copy doesn't make the reader feel something in the first
                  five seconds, you don't have copy. You have{" "}
                  <em className="text-coral">decoration</em>."
                </p>
                <div className="mt-6 flex items-center gap-3 pt-5 border-t border-border/60">
                  <PersonaAvatar persona={PERSONAS_BY_ID["hormozi"]} size="md" />
                  <div>
                    <div className="font-display font-semibold text-sm">Alex Hormozi</div>
                    <div className="text-xs text-muted-foreground font-mono">$100M Offers · Acquisition.com</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground px-1">
                <span>Default voice today</span>
                <span className="text-foreground">Change anytime ↓</span>
              </div>
            </aside>
          </div>
        </section>

        <section id="voices" className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
          <div className="mb-10 max-w-3xl">
            <div className="text-xs font-mono uppercase tracking-wider text-primary mb-3">
              The whole roster
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-medium leading-tight">
              {PERSONAS.length}+ voices, organized.{" "}
              <em className="italic text-coral">Or just type a name.</em>
            </h2>
            <p className="text-muted-foreground mt-3">
              Don't see who you want? Type any name and we'll generate a voice profile on the fly.
            </p>
          </div>
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
