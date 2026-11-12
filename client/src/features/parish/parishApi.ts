import { apiFetch, apiFileUrl } from "@/lib/api";
import type { Parish } from "@/types";
import mtcarmellogo from "@/assets/mtcarmellogo.png";
import mtcarmelChurch from "@/assets/mtcarmel-church.webp";

type BackendParish = {
  id: string;
  slug: string;
  name: string;
  address: string;
  contact?: string | null;
  email?: string | null;
  seal_url?: string | null;
  tagline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Bundled logos, used until a parish uploads its own in Parish settings. */
const LOCAL_SEALS: Record<string, string> = {
  mtcarmel: mtcarmellogo,
};

/** Local church photos until the API stores them. */
const LOCAL_PHOTOS: Record<string, string> = {
  mtcarmel: mtcarmelChurch,
};

const LOCAL_TAGLINES: Record<string, string> = {
  mtcarmel: "Where faith meets history",
};

/** Mock record datasets still use parish-1 / parish-2 keys. */
const SLUG_TO_MOCK_PARISH_ID: Record<string, string> = {
  mtcarmel: "parish-1",
  "san-nicolas": "parish-2",
};

let parishCache: Parish[] | null = null;

function mapParish(row: BackendParish): Parish {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    contact: row.contact ?? "",
    email: row.email ?? "",
    sealUrl: apiFileUrl(row.seal_url) ?? LOCAL_SEALS[row.slug],
    backgroundImageUrl: apiFileUrl(row.seal_url) ?? LOCAL_SEALS[row.slug],
    photoUrl: LOCAL_PHOTOS[row.slug],
    tagline: row.tagline ?? LOCAL_TAGLINES[row.slug],
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/** Drop the remembered parish list, e.g. after the logo changes, so the next load fetches it fresh. */
export function forgetParishes() {
  parishCache = null;
}

export async function listParishes(): Promise<Parish[]> {
  if (parishCache) return parishCache;
  const data = await apiFetch<{ parishes: BackendParish[] }>("/parishes", { auth: false });
  parishCache = data.parishes.map(mapParish);
  return parishCache;
}

export async function getParishBySlug(slug: string): Promise<Parish | undefined> {
  const all = await listParishes();
  return all.find((p) => p.slug === slug);
}

export async function searchParishes(query: string): Promise<Parish[]> {
  const all = await listParishes();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  const qCompact = q.replace(/\s+/g, "");
  return all.filter((p) => {
    const name = p.name.toLowerCase();
    const address = p.address.toLowerCase();
    const slug = p.slug.toLowerCase();
    return name.includes(q) || address.includes(q) || slug.includes(qCompact);
  });
}

/** Clear cache after seeds/migrations so the UI picks up new parishes. */
export function clearParishCache() {
  parishCache = null;
}

/**
 * Live API parishes use UUIDs; mock datasets still key on parish-1 / parish-2.
 * Match either so admin/parishioner lists aren't empty after real auth.
 */
export async function mockParishIdsFor(liveParishId: string): Promise<string[]> {
  const ids = [liveParishId];
  const parish = (await listParishes()).find((p) => p.id === liveParishId);
  const mockId = parish ? SLUG_TO_MOCK_PARISH_ID[parish.slug] : undefined;
  if (mockId) ids.push(mockId);
  return ids;
}

export async function recordBelongsToParish(
  recordParishId: string,
  liveParishId: string
): Promise<boolean> {
  return (await mockParishIdsFor(liveParishId)).includes(recordParishId);
}
