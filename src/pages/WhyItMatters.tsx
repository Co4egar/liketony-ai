import { ArrowLeft, Zap, Target, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { DomainBar } from "@/components/DomainBar";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { PERSONAS_BY_ID, PERSONAS } from "@/data/personas";

const FEATURED_IDS = ["hormozi", "jobs", "musk", "robbins", "carlin", "hemingway"];

const WhyItMatters = () => {
  const featured = FEATURED_IDS.map((id) => PERSONAS_BY_ID[id]).filter(Boolean);

  return (
    <div className="min-h-screen relative">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-border/40">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shadow-warm">
            <span className="font-display font-bold text-primary-foreground text-lg leading-none">L</span>
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">
            LikeTony<span className="text-primary">.ai</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </header>

      <main className="relative">
        {/* WHY (Hormozi value-stack) */}
        <section className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
          <div className="max-w-3xl mb-14">
            <div className="text-xs font-mono uppercase tracking-wider text-primary mb-4">
              Here's the deal
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-medium leading-[1.05] tracking-tight">
              Most founders write copy like an HR memo.{" "}
              <em className="italic text-coral">Then wonder why nobody buys.</em>
            </h1>
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

        {/* HOW IT WORKS */}
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
                    <h3 className="font-display text-xl font-medium mb-1.5">{s.t}</h3>
                    <p className="text-muted-foreground leading-relaxed">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PROOF */}
        <section className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
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
            <Link to="/" className="text-sm text-primary hover:underline font-medium">
              See all {PERSONAS.length}+ voices →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-xl overflow-hidden">
            {featured.map((p) => (
              <div key={p.id} className="bg-card/40 p-6">
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
              </div>
            ))}
          </div>
        </section>

        {/* CLOSER */}
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
              <DomainBar
                defaultUrl=""
                onSubmit={(u) => {
                  window.location.href = `/?url=${encodeURIComponent(u)}`;
                }}
                ctaLabel="Rewrite my page"
              />
            </div>
            <div className="mt-5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              ↓ Click. The. Button. ↓
            </div>
          </div>
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

export default WhyItMatters;
