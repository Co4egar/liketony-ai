import { useState } from "react";
import { ArrowRight, Check, Zap, Target, DollarSign, Quote } from "lucide-react";
import { DomainBar } from "@/components/DomainBar";
import { PersonaCatalog } from "@/components/PersonaCatalog";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { Workspace } from "@/components/Workspace";
import { Persona, PERSONAS_BY_ID, PERSONAS } from "@/data/personas";
import { toast } from "sonner";

const DEFAULT_PERSONA_ID = "hormozi";

const FEATURED_IDS = ["hormozi", "jobs", "musk", "robbins", "carlin", "hemingway"];

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

  const featured = FEATURED_IDS.map((id) => PERSONAS_BY_ID[id]).filter(Boolean);

  return (
    <div className="min-h-screen relative">
      {/* Top nav */}
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-border/40">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shadow-warm">
            <span className="font-display font-bold text-primary-foreground text-lg leading-none">L</span>
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">
            LikeTony<span className="text-primary">.ai</span>
          </span>
        </a>
        <nav className="hidden sm:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#voices" className="hover:text-foreground transition-colors">Voices</a>
          <a href="#proof" className="hover:text-foreground transition-colors">Proof</a>
          <a
            href="#start"
            className="px-3.5 py-1.5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Rewrite my page
          </a>
        </nav>
      </header>

      <main className="relative">
        {/* HERO */}
        <section id="start" className="px-6 sm:px-10 pt-20 pb-24 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            {/* Left: copy */}
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

            {/* Right: editorial pull-quote card */}
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

        {/* MARQUEE: voices ribbon */}
        <section className="border-y border-border/60 bg-card/30 py-5 overflow-hidden marquee-fade">
          <div className="flex items-center gap-10 whitespace-nowrap text-sm text-muted-foreground font-mono uppercase tracking-wider px-6">
            <span className="text-coral">100+ voices</span>
            <span>·</span>
            <span>Hormozi</span>
            <span>·</span>
            <span>Hemingway</span>
            <span>·</span>
            <span>Steve Jobs</span>
            <span>·</span>
            <span>Tony Robbins</span>
            <span>·</span>
            <span>George Carlin</span>
            <span>·</span>
            <span>Yoda</span>
            <span>·</span>
            <span>Bugs Bunny</span>
            <span>·</span>
            <span>Snoop Dogg</span>
            <span>·</span>
            <span>Brené Brown</span>
            <span>·</span>
            <span>Or any name you type</span>
          </div>
        </section>

        {/* WHY (Hormozi value-stack) */}
        <section id="how" className="px-6 sm:px-10 py-24 max-w-6xl mx-auto">
          <div className="max-w-3xl mb-14">
            <div className="text-xs font-mono uppercase tracking-wider text-primary mb-4">
              Here's the deal
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-medium leading-[1.05] tracking-tight">
              Most founders write copy like an HR memo.{" "}
              <em className="italic text-coral">Then wonder why nobody buys.</em>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-xl overflow-hidden">
            <ValueCard
              icon={<Target className="w-5 h-5" />}
              kicker="01 · Voice"
              title="Boring voice = boring price."
              body="A page that sounds like everyone else gets compared on price. A page that sounds like someone gets compared to nobody. Pick a voice. Stop competing on dollars."
            />
            <ValueCard
              icon={<Zap className="w-5 h-5" />}
              kicker="02 · Speed"
              title="60 seconds. Not 6 weeks."
              body="No copywriter. No agency. No 'discovery call.' You drop a URL, we rewrite every block on the page in the voice you pick. Preview, download, ship. Done."
            />
            <ValueCard
              icon={<DollarSign className="w-5 h-5" />}
              kicker="03 · Stack"
              title="Test 10 voices for the cost of zero."
              body="Try Hormozi. Try Jobs. Try Hemingway. Try the weird one. Run them past your audience. Keep the one that prints. The whole point is — you don't have to guess."
            />
          </div>
        </section>

        {/* HOW IT WORKS — 3 step editorial */}
        <section className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-primary mb-4">
                How it works
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-medium leading-tight">
                Three steps. Then you ship.
              </h2>
            </div>

            <ol className="space-y-px bg-border/60 border border-border/60 rounded-xl overflow-hidden">
              {[
                {
                  n: "01",
                  t: "Drop your URL.",
                  d: "We pull your live landing — every headline, button, bullet — and break it into rewritable blocks.",
                },
                {
                  n: "02",
                  t: "Pick a voice. Pick the intensity.",
                  d: "Hormozi at 100 hits like a freight train. Hemingway at 30 reads like a novel. You decide.",
                },
                {
                  n: "03",
                  t: "Preview, download, ship.",
                  d: "Side-by-side preview. Download the HTML. Or copy a share link and send it to your team. That's it.",
                },
              ].map((s) => (
                <li key={s.n} className="bg-card/40 p-6 sm:p-7 flex gap-6 items-start">
                  <div className="font-display text-3xl text-coral font-medium tabular-nums shrink-0 w-12">
                    {s.n}
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-xl font-medium mb-1.5">{s.t}</div>
                    <div className="text-muted-foreground leading-relaxed">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PROOF — featured personas as editorial card grid */}
        <section id="proof" className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-primary mb-3">
                Featured voices
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-medium leading-tight max-w-2xl">
                Pick the voice your customer{" "}
                <em className="italic text-coral">already trusts.</em>
              </h2>
            </div>
            <a href="#voices" className="text-sm text-primary hover:underline font-medium">
              See all {PERSONAS.length}+ voices →
            </a>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-xl overflow-hidden">
            {featured.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPersona(p);
                  document.getElementById("start")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group text-left bg-card/40 hover:bg-card/80 p-6 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <PersonaAvatar persona={p} size="md" />
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-lg leading-tight truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                      {p.category.replace("-", " ")}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {p.shortBio}
                </p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Use this voice <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* FULL CATALOG */}
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

        {/* CLOSER — Hormozi hard CTA */}
        <section className="px-6 sm:px-10 py-24">
          <div className="max-w-4xl mx-auto relative rounded-2xl border border-border bg-card/60 p-10 sm:p-14 text-center grain overflow-hidden shadow-warm">
            <div className="text-xs font-mono uppercase tracking-wider text-primary mb-5">
              So here's the offer
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-medium leading-[1.05] tracking-tight max-w-2xl mx-auto">
              You can keep the page you have.{" "}
              <em className="italic text-coral">Or you can have one that converts.</em>
            </h2>
            <p className="text-muted-foreground mt-6 max-w-xl mx-auto leading-relaxed">
              Free to try. No card. No signup. One URL, one voice, 60 seconds.
              If it's worse, close the tab. If it's better — you already know what to do.
            </p>
            <div className="mt-10 max-w-xl mx-auto">
              <DomainBar defaultUrl={url} onSubmit={handleGo} ctaLabel="Rewrite my page" />
            </div>
            <div className="mt-5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              ↓ Click. The. Button. ↓
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 sm:px-10 py-10 border-t border-border/60 mt-10">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-[10px] leading-none">L</span>
              </div>
              <span className="font-display font-semibold text-foreground">LikeTony.ai</span>
              <span>· Your landing, in their voice.</span>
            </div>
            <a
              href="https://lovable.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Built on Lovable
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
};

function ValueCard({
  icon,
  kicker,
  title,
  body,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-card/40 p-7 sm:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-primary/15 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {kicker}
        </div>
      </div>
      <div className="font-display text-xl leading-snug font-medium">{title}</div>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

export default Index;
