// Build loading-stage labels in the voice of a persona.
// Lightweight, no AI call — pulls from the persona's own tics/signature phrases.

import type { Persona } from "@/data/personas";

const DEFAULT_STAGES = [
  "Fetching site",
  "Extracting copy",
  "Rewriting in voice",
  "Rendering preview",
] as const;

// Hand-tuned stages for the most recognizable characters.
// Keys match Persona.id.
const HAND_TUNED: Record<string, readonly [string, string, string, string]> = {
  "bugs-bunny": [
    "Eh, fetchin' yer site, doc",
    "Sniffin' out the copy",
    "Gimme a sec, rewritin' it, see",
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
    "Diggin' out the words, like onions",
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
    "Uh… getting your site, I think",
    "Looking at the words. Pretty",
    "Making them sound like me!",
    "Done! …what was I doing?",
  ],
  "homer-simpson": [
    "Mmm… site",
    "Donut break — checking copy",
    "D'oh, rewriting in Homer",
    "Woo-hoo! Preview's ready",
  ],
  "spongebob-squarepants": [
    "I'm READY! Fetching the site!",
    "Grabbing every juicy word!",
    "Rewriting it KRABBY-style!",
    "Tada! Preview, fresh from the grill!",
  ],
  "morty-smith": [
    "Aw geez, getting the site, Rick",
    "Uh, grabbing the copy I guess",
    "Oh man, rewriting it — burp",
    "O-okay, preview's done, Rick",
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
    "We bring the site. Quietly",
    "We listen to its words",
    "We make it speak with respect",
    "It is done.