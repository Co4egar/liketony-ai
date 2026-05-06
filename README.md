# LikeTony.ai

> **LikeTony.ai is a free tool that rewrites any landing page in seconds using the tone of voice of a chosen persona — from Steve Jobs to Donald Duck and Yoda.** Let's help small business owners make their websites more compelling.

[![Live](https://img.shields.io/badge/live-liketony.ai-ff7a59?style=flat-square)](https://liketony.ai)
[![Price](https://img.shields.io/badge/price-free-22c55e?style=flat-square)](https://liketony.ai)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Tailwind-0ea5e9?style=flat-square)](https://vitejs.dev)

![LikeTony.ai — landing page rewriter](docs/screenshots/home.png)

---

## What it does

Drop a URL. Pick a persona. Get back the **same page** — same layout, same images, same CSS — but with every headline, paragraph and CTA rewritten in that persona's voice. Side-by-side preview, then download the HTML.

**100% free. No signup, no account, no card, no subscription.** When you're ready to download, we ask for an email and send the file link there.

## Why it exists

Most small business owners write landing copy that sounds like an HR memo. A page that sounds like *someone* converts better than a page that sounds like everyone else. The fastest way to find your voice isn't a 6-week branding workshop — it's borrowing one for 60 seconds, just to see what changes.

![Why it matters](docs/screenshots/why-it-matters.png)

## How it works

1. **Drop your URL.** We pull your live page and break it into rewritable text blocks while preserving the entire DOM.
2. **Pick a voice.** 100+ curated personas — Steve Jobs, Hormozi, Hemingway, Churchill, Donald Duck, Yoda — or type any name and we'll generate the voice profile on the fly.
3. **Preview, enter your email, ship.** Side-by-side preview against the original. Click **Download HTML**, drop your email, and we'll send the download link.

```
URL → Scrape (Firecrawl) → Extract text segments →
Lovable AI Gateway (Gemini / GPT) → Reinsert by index →
Preview → Email gate → Download link emailed → Done
```

## Persona catalog

A curated, hand-tuned voice library. Each persona ships with a `voice_prompt` defining tone, lexicon, rhythm, signature moves and forbidden patterns. Categories include:

- **Entrepreneurs** — Jobs, Musk, Bezos, Branson, Sara Blakely
- **Business coaches** — Hormozi, Tony Robbins, Brené Brown, Simon Sinek
- **Historical figures** — Churchill, Napoleon, Cleopatra, MLK
- **Comedians** — Carlin, Chappelle, Hannah Gadsby
- **Writers** — Hemingway, Bukowski, Tolkien
- **Cartoons** — Donald Duck, Yoda, and friends
- **Athletes, politicians, musicians, scientists, spiritual leaders…**

Don't see who you want? Type the name, hit **Add**, and a custom voice profile is generated and cached.

---

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind, shadcn/ui |
| Backend | Lovable Cloud (managed Supabase) |
| Scraping | Firecrawl |
| AI | Lovable AI Gateway (Gemini 2.5 / GPT-5) |
| Email | Lovable Emails on `notify.liketony.ai` |
| Hosting | Lovable |

### Edge functions

- `process-site` — Firecrawl scrape + segment extraction + AI rewrite + final HTML assembly
- `generate-persona` — synthesize a voice profile for custom persona names
- `send-download-link` — validates email, rate-limits by IP, queues the download email
- `download-html` — public endpoint that streams the rewritten HTML by `publicId`
- `send-transactional-email` — delivers the download link via the `rewrite-download` template

## Project structure

```
src/
  pages/         Index, WhyItMatters, Download, SharedRewrite, Unsubscribe, NotFound
  components/    DomainBar, PersonaCatalog, Workspace, DownloadEmailGate, SellingScoreCard
  data/          personas.ts (curated voice library)
  lib/           preview-html.ts, persona-stages.ts
supabase/
  functions/     edge functions (see above)
  _shared/       landing.ts, transactional email templates
```

## Local development

Requirements: **Node 18+** (or Bun) and `npm` / `bun`.

```bash
git clone <repo>
cd <repo>
npm install
npm run dev
```

The app runs against the live Lovable Cloud backend out of the box — no local Supabase needed. Environment variables in `.env` are auto-managed by Lovable Cloud:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Build

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build locally
```

### Tests

```bash
npx vitest run
```

## Deployment

This project is deployed on **Lovable**. Click **Publish** in the Lovable editor — the live URL is [liketony.ai](https://liketony.ai). Edge functions deploy automatically on save.

## License

Proprietary. © LikeTony.ai
