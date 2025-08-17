// src/lib/clubs.ts
// Auto-discovers Markdown clubs under: src/clubs/<slug>/
//
// Each club folder:
//   index.md                  # YAML frontmatter + markdown body
//   images/cover.(jpg|jpeg|png|webp)   # cover image
//   images/gallery/*.(jpg|jpeg|png|webp)  # gallery (optional)
//   docs/*                    # any downloadable files (optional)
//
// Frontmatter (flexible):
// ---
// name: "…"
// short: "…"
// cover: "./cover.jpg"          # optional; if omitted, we'll still detect images/cover.*
// meetings:
//   - days: ["Mon","Wed"]
//     start: "15:00"
//     end: "16:30"
//     room: "B201"
//     frequency: "weekly"
//     note: "…"
// contacts:
//   club: { email: "...", discord: "...", instagram: "...", website: "..." }
//   advisors: [{ name: "...", email: "..." }, ...]
//   officers: [{ name: "...", role: "...", email?: "...", instagram?: "..." }, ...]
// categories: ["STEM","…"]
// ---
// (Markdown body…)

type Meeting = {
  days?: string[]; // ["Mon","Wed"] or ["Monday","Wednesday"]
  start?: string; // "HH:MM" 24h
  end?: string; // "HH:MM" 24h
  room?: string;
  frequency?: string; // free text (weekly/biweekly/…)
  note?: string;
};

type ClubContacts = {
  email?: string;
  discord?: string;
  instagram?: string;
  website?: string;
};

type Person = {
  name: string;
  role?: string;
  email?: string;
  instagram?: string;
};

export type Frontmatter = {
  name: string;
  short: string;
  cover?: string; // e.g., "./cover.jpg"
  gallery?: string[]; // e.g., ["./images/gallery/1.jpg", ...]
  meetings?: Meeting[];
  contacts?: {
    club?: ClubContacts;
    advisors?: Person[];
    officers?: Person[];
  };
  categories?: string[];
};

export type ClubCardData = {
  slug: string;
  name: string;
  short?: string;
  coverUrl?: string;
  categories?: string[];
};

export type ClubFullData = ClubCardData & {
  meetings?: Meeting[];
  contacts?: Frontmatter["contacts"];
  mdComponent: any; // rendered Markdown component for detail page
  galleryUrls: string[];
  docUrls: string[];
};

// -------------------- Globs (built-time asset discovery) --------------------

// 1) Markdown: frontmatter + default component
const mdModules = import.meta.glob("../clubs/*/index.md", {
  eager: true,
}) as Record<
  string,
  {
    frontmatter: Frontmatter;
    default: any;
  }
>;

const coverImages = import.meta.glob(
  "../clubs/*/images/cover.{jpg,jpeg,png,webp}",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const galleryImages = import.meta.glob(
  "../clubs/*/images/gallery/*.{jpg,jpeg,png,webp,svg,gif}",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const docFiles = import.meta.glob("../clubs/*/docs/*", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const imagesAny = import.meta.glob("../clubs/*/images/*", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// ------------------------------ Helpers -------------------------------------

function pathToSlug(p: string): string {
  // e.g., "../clubs/robotics/index.md" → "robotics"
  const m = p.match(/\/clubs\/([^/]+)\//);
  return m ? m[1] : "";
}

function sortByName<T extends { name: string }>(a: T, b: T) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function resolveCoverUrl(slug: string, fm: Frontmatter | undefined): string {
  // 1. Prefer frontmatter.cover if valid
  if (fm?.cover) {
    const rel = fm.cover.replace(/^\.\//, "");
    const key = `../clubs/${slug}/images/${rel}`;
    if (imagesAny[key]) return imagesAny[key];
  }

  // 2. Check for images/cover.*
  const prefix = `../clubs/${slug}/images/cover`;
  const found =
    coverImages[`${prefix}.jpg`] ??
    coverImages[`${prefix}.jpeg`] ??
    coverImages[`${prefix}.png`] ??
    coverImages[`${prefix}.webp`];
  if (found) return found;

  // 3. Fallback to default cover from /public
  return `${import.meta.env.BASE_URL}/default-cover.jpg`;
}

function resolveGalleryUrls(
  slug: string,
  fm: Frontmatter | undefined
): string[] {
  // If frontmatter.gallery exists, resolve each entry to a built URL; else, auto-enumerate the folder
  if (fm?.gallery && Array.isArray(fm.gallery) && fm.gallery.length > 0) {
    const urls: string[] = [];
    for (const relPath of fm.gallery) {
      const rel = relPath.replace(/^\.\//, ""); // "./images/gallery/1.jpg" → "images/gallery/1.jpg"
      const key = `../clubs/${slug}/${rel}`;
      // Gallery files live under images/gallery/, but in case a user lists images/*, try both maps
      const url = galleryImages[key] ?? imagesAny[key]; // fallback if someone points to "images/<file>"
      if (url) urls.push(url);
    }
    return urls;
  }

  // Auto-enumerate gallery folder
  const prefix = `../clubs/${slug}/images/gallery/`;
  return Object.entries(galleryImages)
    .filter(([p]) => p.startsWith(prefix))
    .map(([, url]) => url)
    .sort();
}

function resolveDocUrls(slug: string): string[] {
  const prefix = `../clubs/${slug}/docs/`;
  return Object.entries(docFiles)
    .filter(([p]) => p.startsWith(prefix))
    .map(([, url]) => url)
    .sort();
}

// ------------------------------- Public API ---------------------------------

export async function getClubs(): Promise<ClubCardData[]> {
  const cards: ClubCardData[] = [];

  for (const [path, mod] of Object.entries(mdModules)) {
    const slug = pathToSlug(path);
    const fm = mod.frontmatter;

    cards.push({
      slug,
      name: fm.name,
      short: fm.short,
      coverUrl: resolveCoverUrl(slug, fm),
      categories: fm.categories,
    });
  }

  return cards.sort(sortByName);
}

export async function getClubBySlug(
  slug: string
): Promise<ClubFullData | null> {
  const mdKey = Object.keys(mdModules).find((p) => pathToSlug(p) === slug);
  if (!mdKey) return null;

  const mod = mdModules[mdKey];
  const fm = mod.frontmatter;

  return {
    slug,
    name: fm.name,
    short: fm.short,
    categories: fm.categories,
    coverUrl: resolveCoverUrl(slug, fm),
    meetings: fm.meetings,
    contacts: fm.contacts,
    mdComponent: mod.default,
    galleryUrls: resolveGalleryUrls(slug, fm),
    docUrls: resolveDocUrls(slug),
  };
}
