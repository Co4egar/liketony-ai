// Build loading-stage labels in the voice of a persona.
// Lightweight, no AI call — pulls from the persona's own tics/signature phrases.

import type { Persona } from "@/data/personas";

export const DEFAULT_STAGES = [
  "Fetching site",
  "Extracting copy",
  "Rewriting in voice",
  "Rendering preview",
] as const;

// Hand-tuned stages for the most recognizable characters.
type Stages = readonly [string, string, string, string];

const HAND_TUNED: Record<string, Stages> = {
  "bugs-bunny": [
    "Eh, fetchin' yer site, doc",
    "Sniffin' out the copy",
    "Rewritin' it, see",
    "Bingo — servin' it up, pal",
  ],
  "yoda": [
    "Fetch the site, I will",
    "Extract the words, I must",
    "Rewrite in my voice, I do",
    "Ready, the preview is",
  ],
  "shrek": [
    "Aye, grabbin' yer site",
    "Diggin' out the words like onions",
    "Rewritin' the bloody thing",
    "Done. Now get out o' me swamp",
  ],
  "scooby-doo": [
    "Rorking on it — rummy!",
    "Rooting through the ropy",
    "Rewriting it ruff!",
    "Ra-roo, ready, Raggy!",
  ],
  "patrick-star": [
    "Uh... getting your site, I think",
    "Looking at the words. Pretty.",
    "Making them sound like me!",
    "Done! ...what was I doing?",
  ],
  "homer-simpson": [
    "Mmm... site",
    "Checking the copy. Donuts.",
    "D'oh, rewriting in Homer",
    "Woo-hoo! Preview's ready",
  ],
  "spongebob-squarepants": [
    "I'm READY! Fetching the site!",
    "Grabbing every juicy word!",
    "Rewriting it KRABBY-style!",
    "Tada! Fresh preview!",
  ],
  "morty-smith": [
    "Aw geez, getting the site",
    "Uh, grabbing the copy I guess",
    "Oh man, rewriting it — burp",
    "O-okay, preview's done",
  ],
  "rick-sanchez": [
    "*burp* Fetching the dumb site",
    "Pulling the copy, Morty, obviously",
    "*burp* Rewriting this garbage",
    "Done. You're welcome, Morty",
  ],
  "tony-soprano": [
    "Pullin' the site. Capisce?",
    "Lookin' at what we got here",
    "Makin' it talk like family",
    "Fuhgeddaboutit — it's ready",
  ],
  "vito-corleone": [
    "We bring the site. Quietly.",
    "We listen to its words.",
    "We make it speak with respect.",
    "It is done. No questions.",
  ],
  "gary-vaynerchuk": [
    "Yo, pulling the site — let's go",
    "Reading every line, no fluff",
    "Rewriting it. Hard truths only",
    "Boom. Preview's live. Crush it",
  ],
  "donald-trump": [
    "We're getting the site. Tremendous",
    "Reading the copy. Many people say weak",
    "Rewriting it. The best words",
    "Done. Believe me, it's huge",
  ],
  "grant-cardone": [
    "Pulling the site. 10X speed",
    "Checking every word for money",
    "Taking massive action on the copy",
    "Done. Stop being average",
  ],
  "sadhguru": [
    "Fetching the site, see",
    "Observing its compulsions",
    "Engineering the words within",
    "The preview is ready, isn't it?",
  ],
  "osho": [
    "Entering the site in silence",
    "Watching the words arise",
    "Letting the copy become aware",
    "Beloved, it is ready",
  ],
  "dalai-lama": [
    "Gently fetching the site",
    "Reading with warm-heartedness",
    "Rewriting with compassion",
    "Wonderful — the preview is ready",
  ],
  "ravi-shankar": [
    "Taking a breath and fetching",
    "Bringing the words into clarity",
    "Making work a celebration",
    "Smile — the preview is ready",
  ],
  "elon-musk": [
    "Fetching site... interesting",
    "Parsing copy. First principles",
    "Rewriting. Should ship faster",
    "Preview ready. To Mars",
  ],
  "steve-jobs": [
    "We're getting the site",
    "We looked at the words. Most are wrong",
    "We rewrote it. Insanely better",
    "And one more thing... it's ready",
  ],
  "darth-vader": [
    "I find your site... interesting",
    "The copy's lack of faith disturbs me",
    "Rewriting. You underestimate the Force",
    "It is done. Your destiny is fulfilled",
  ],
  "gollum": [
    "We finds the site, precious",
    "We sees the words, yess",
    "We changes them, gollum gollum",
    "Ready it is, my precious",
  ],
  "borat": [
    "I am fetching the site. Very nice!",
    "Looking the copy. Wawaweewa",
    "Making rewrite. Great success!",
    "Is ready. High five!",
  ],
  "hulk-hogan": [
    "Fetching the site, brother!",
    "Reading copy, dude!",
    "Rewriting it, Hulkamania-style!",
    "Whatcha gonna do? It's ready!",
  ],
  "deadpool": [
    "Fetching the site (and breaking the 4th wall)",
    "Skimming the copy. Yawn",
    "Rewriting in maximum effort",
    "Done. Chimichangas all around",
  ],
};

// Generic templated fallback — uses the first signature phrase or tic if available.
function generic(persona: Pick<Persona, "name" | "signaturePhrases" | "verbalTics">): Stages {
  const phrase =
    persona.signaturePhrases?.[0]?.trim() ||
    persona.verbalTics?.split(/[.!?]/)[0]?.trim() ||
    "";
  const tail = phrase ? ` — ${phrase}` : "";
  return [
    `Fetching site${tail ? "" : ""}`,
    "Extracting copy",
    `Rewriting as ${persona.name}${tail}`,
    "Rendering preview",
  ];
}

export function getPersonaStages(
  persona: Pick<Persona, "id" | "name" | "signaturePhrases" | "verbalTics">,
): Stages {
  return HAND_TUNED[persona.id] ?? generic(persona);
}
