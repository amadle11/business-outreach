/** Design + copy presets for the mock preview site, chosen from the Google place type. */
export type Profile = {
  key: string;
  label: string;
  accent: string;
  dark: string;
  tagline: (town: string) => string;
  about: (name: string, town: string) => string;
  services: string[];
  cta: string;
};

const P: Profile[] = [
  {
    key: "food",
    label: "Restaurant & food",
    accent: "#d9480f",
    dark: "#2b1a12",
    tagline: (t) => `Fresh, made-to-order food in the heart of ${t}`,
    about: (n, t) =>
      `${n} has been serving the ${t} community with good food and friendly service. Stop in, call ahead for pickup, or ask about catering for your next event.`,
    services: ["Dine-in", "Takeout & call-ahead orders", "Catering for parties", "Daily specials"],
    cta: "Call to order",
  },
  {
    key: "beauty",
    label: "Salon & barber",
    accent: "#a61e4d",
    dark: "#25121a",
    tagline: (t) => `Look sharp. Feel great. Right here in ${t}.`,
    about: (n, t) =>
      `At ${n}, every client gets real attention and a cut or style they love. Walk-ins welcome, or call to book your spot with one of our ${t} pros.`,
    services: ["Haircuts & styling", "Color & treatments", "Walk-ins welcome", "Gift cards available"],
    cta: "Book an appointment",
  },
  {
    key: "auto",
    label: "Auto & marine",
    accent: "#1971c2",
    dark: "#0f1b2b",
    tagline: (t) => `Honest, reliable repair work for ${t} drivers`,
    about: (n, t) =>
      `${n} keeps ${t} on the road with straightforward diagnostics, fair pricing, and work done right the first time.`,
    services: ["Diagnostics", "Brakes & suspension", "Oil changes & maintenance", "Free estimates"],
    cta: "Call for a quote",
  },
  {
    key: "home",
    label: "Home services & trades",
    accent: "#2b8a3e",
    dark: "#11231a",
    tagline: (t) => `Licensed, local, and ready to help across ${t}`,
    about: (n, t) =>
      `${n} serves homeowners and businesses in ${t} and nearby towns. Quality work, clear quotes, and we show up when we say we will.`,
    services: ["Residential & commercial", "Free estimates", "Emergency service", "Fully insured"],
    cta: "Get a free estimate",
  },
  {
    key: "pet",
    label: "Pet services",
    accent: "#e67700",
    dark: "#2b1d0a",
    tagline: (t) => `Happy pets, happy owners in ${t}`,
    about: (n, t) =>
      `${n} treats every pet like family. Trusted by ${t} pet owners for gentle, careful service.`,
    services: ["Grooming", "Bath & brush", "Nail trims", "Gentle handling"],
    cta: "Book a visit",
  },
  {
    key: "retail",
    label: "Shop & retail",
    accent: "#5f3dc4",
    dark: "#1b1430",
    tagline: (t) => `Your local favorite in ${t}`,
    about: (n, t) =>
      `${n} is a locally owned shop proudly serving ${t}. Come see what's new, or call ahead and we'll have it ready.`,
    services: ["Locally owned", "Friendly service", "Special orders", "Gift ideas"],
    cta: "Call the shop",
  },
  {
    key: "default",
    label: "Local business",
    accent: "#0c8599",
    dark: "#0b2226",
    tagline: (t) => `Proudly serving ${t} and the surrounding area`,
    about: (n, t) =>
      `${n} is a locally owned business serving ${t}. Reach out today, we'd love to help.`,
    services: ["Locally owned", "Friendly, reliable service", "Fair pricing", "Call for details"],
    cta: "Call us today",
  },
];

const TYPE_MAP: [RegExp, string][] = [
  [/hair|barber|beauty|nail|(^|[\s_])spa([\s_]|$)|salon|tattoo|makeup|massage/, "beauty"],
  [/restaurant|pizza|cafe|coffee|bakery|(^|[\s_])deli([\s_]|$)|food|meal|(^|[\s_])bar([\s_]|$)|diner|sandwich|bagel|ice_cream|dessert|catering/, "food"],
  [/car_|auto|tire|boat|marine|motorcycle/, "auto"],
  [/plumb|electric|roof|contractor|hvac|landscap|lawn|clean|paint|locksmith|moving|handyman|pest|pool|fence|construction|laundry/, "home"],
  [/pet|veterinar|dog/, "pet"],
  [/store|shop|florist|tailor|clothing|jewelry|gift|market|boutique/, "retail"],
];

export function profileFor(types: string[], query?: string | null): Profile {
  // Google's own place types win; the search phrase is only a fallback.
  for (const hay of [types.join(" "), (query || "").toLowerCase().replace(/ /g, "_")]) {
    if (!hay) continue;
    for (const [re, key] of TYPE_MAP) if (re.test(hay)) return getProfile(key);
  }
  return getProfile("default");
}

export function getProfile(key: string | null | undefined): Profile {
  return P.find((p) => p.key === key) ?? P[P.length - 1];
}

export const PROFILES = P;
