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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LikeTony.ai",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Drop your URL, pick a voice (Hormozi, Jobs, Hemingway and more), and rewrite your landing page in 60 seconds.",
    offers: {
      "@type": "Offer",
      price: "19",
      priceCurrency: "USD",
    },
  };

  return (
    <div className="min-h-screen relative">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-snug">
            Drop your URL. Pick a voice your customer already trusts.{" "}
            <span className="text-foreground font-medium">We rewrite the whole page in 60 seconds</span> — Hormozi, Jobs, Hemingway, whoever sells.
          </p>

          <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-4 items-stretch">
            <div className="space-y-2">
              <DomainBar defaultUrl={url} onSubmit={handleGo} ctaLabel="Rewrite it" />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> No signup</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Download HTML</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Free to try</span>
              </div>
            </div>

            <aside aria-label="Selected voice" className="relative rounded-xl border border-border bg-card/60 px-4 py-3 shadow-warm">
              <div className="flex items-center gap-3">
                <PersonaAvatar persona={persona} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground m-0">
                    Voice selected
                  </p>
                  <p className="font-display font-semibold text-lg leading-tight truncate m-0">
                    {persona.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate m-0">
                    {persona.shortBio}
                  </p>
                </div>
              </div>
              {(() => {
                const punchline =
                  persona.signaturePhrases?.length
                    ? [...persona.signaturePhrases].sort((a, b) => b.length - a.length)[0]
                    : persona.shortBio;
                return (
                  <blockquote className="mt-3 pt-3 border-t border-border/60 text-sm italic text-foreground leading-snug">
                    <span className="text-coral font-display text-lg leading-none mr-1">“</span>
                    {punchline}
                    <span className="text-coral font-display text-lg leading-none ml-0.5">”</span>
                  </blockquote>
                );
              })()}
            </aside>
          </div>
        </section>

        <section id="voices" aria-labelledby="voices-heading" className="px-6 sm:px-10 pt-2 pb-16 max-w-6xl mx-auto">
          <h2 id="voices-heading" className="sr-only">Pick a voice</h2>
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
