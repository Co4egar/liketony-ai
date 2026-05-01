// Map persona ids to a Wikipedia article slug. Wikipedia REST API returns a
// thumbnail we can use directly. For cartoon characters we point at their
// Wikipedia page (which usually has a character image as the thumbnail).
export const WIKI_SLUGS: Record<string, string> = {
  // Business coaches
  hormozi: "Alex_Hormozi",
  robbins: "Tony_Robbins",
  "brene-brown": "Brené_Brown",
  "simon-sinek": "Simon_Sinek",
  "gary-vee": "Gary_Vaynerchuk",
  // Entrepreneurs
  jobs: "Steve_Jobs",
  musk: "Elon_Musk",
  bezos: "Jeff_Bezos",
  branson: "Richard_Branson",
  blakely: "Sara_Blakely",
  ford: "Henry_Ford",
  disney: "Walt_Disney",
  // Actors
  freeman: "Morgan_Freeman",
  keanu: "Keanu_Reeves",
  hepburn: "Audrey_Hepburn",
  deniro: "Robert_De_Niro",
  nicholson: "Jack_Nicholson",
  // Historical
  churchill: "Winston_Churchill",
  napoleon: "Napoleon",
  cleopatra: "Cleopatra",
  mlk: "Martin_Luther_King_Jr.",
  davinci: "Leonardo_da_Vinci",
  lincoln: "Abraham_Lincoln",
  caesar: "Julius_Caesar",
  // Comedians
  carlin: "George_Carlin",
  chappelle: "Dave_Chappelle",
  seinfeld: "Jerry_Seinfeld",
  gadsby: "Hannah_Gadsby",
  rock: "Chris_Rock",
  // Writers
  hemingway: "Ernest_Hemingway",
  bukowski: "Charles_Bukowski",
  tolkien: "J._R._R._Tolkien",
  austen: "Jane_Austen",
  shakespeare: "William_Shakespeare",
  seuss: "Dr._Seuss",
  poe: "Edgar_Allan_Poe",
  // Musicians
  bowie: "David_Bowie",
  dylan: "Bob_Dylan",
  snoop: "Snoop_Dogg",
  beyonce: "Beyoncé",
  // Athletes
  ali: "Muhammad_Ali",
  jordan: "Michael_Jordan",
  kobe: "Kobe_Bryant",
  serena: "Serena_Williams",
  // Scientists
  einstein: "Albert_Einstein",
  feynman: "Richard_Feynman",
  sagan: "Carl_Sagan",
  hawking: "Stephen_Hawking",
  curie: "Marie_Curie",
  // Politicians
  obama: "Barack_Obama",
  thatcher: "Margaret_Thatcher",
  kennedy: "John_F._Kennedy",
  mandela: "Nelson_Mandela",
  // Cartoons
  "homer-simpson": "Homer_Simpson",
  spongebob: "SpongeBob_SquarePants_(character)",
  "rick-sanchez": "Rick_Sanchez",
  "bugs-bunny": "Bugs_Bunny",
  shrek: "Shrek_(character)",
  yoda: "Yoda",
  "patrick-star": "Patrick_Star",
  "peter-griffin": "Peter_Griffin",
  "bart-simpson": "Bart_Simpson",
  "scooby-doo": "Scooby-Doo_(character)",
};

// Hand-picked overrides for personas where Wikipedia has no usable photo
// or returns the wrong image (a logo / poster instead of the character).
// These take priority over WIKI_SLUGS lookup.
import hormoziPortrait from "@/assets/persona-hormozi.webp";
import bugsBunnyPortrait from "@/assets/persona-bugs-bunny.jpg";

export const PHOTO_OVERRIDES: Record<string, string> = {
  hormozi: hormoziPortrait,
  "bugs-bunny": bugsBunnyPortrait,
};

const memCache = new Map<string, string | null>();
const STORAGE_KEY = "personapress.photoCache.v2";

function loadStorage(): Record<string, string | null> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveStorage(map: Record<string, string | null>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

// Hydrate in-memory cache from localStorage once.
let hydrated = false;
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const stored = loadStorage();
  for (const [k, v] of Object.entries(stored)) memCache.set(k, v);
}

const inflight = new Map<string, Promise<string | null>>();

export async function fetchPersonaPhoto(personaId: string, name: string): Promise<string | null> {
  hydrate();
  // 1. Hard overrides win.
  if (PHOTO_OVERRIDES[personaId]) {
    const url = PHOTO_OVERRIDES[personaId];
    memCache.set(personaId, url);
    return url;
  }
  if (memCache.has(personaId)) return memCache.get(personaId) ?? null;
  if (inflight.has(personaId)) return inflight.get(personaId)!;

  const slug = WIKI_SLUGS[personaId] ?? name.replace(/\s+/g, "_");
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}?redirect=true`;

  const p = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const photo: string | null =
        data?.thumbnail?.source ?? data?.originalimage?.source ?? null;
      memCache.set(personaId, photo);
      const stored = loadStorage();
      stored[personaId] = photo;
      saveStorage(stored);
      return photo;
    } catch {
      memCache.set(personaId, null);
      return null;
    } finally {
      inflight.delete(personaId);
    }
  })();
  inflight.set(personaId, p);
  return p;
}
