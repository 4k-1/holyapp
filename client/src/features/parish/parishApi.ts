import { apiFetch } from "@/lib/api";
import type { Parish } from "@/types";

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

let parishCache: Parish[] | null = null;

function mapParish(row: BackendParish): Parish {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    contact: row.contact ?? "",
    email: row.email ?? "",
    sealUrl: row.seal_url ?? undefined,
    tagline: row.tagline ?? undefined,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
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
  return all.filter(
    (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
  );
}

/** Clear cache after seeds/migrations so the UI picks up new parishes. */
export function clearParishCache() {
  parishCache = null;
}
