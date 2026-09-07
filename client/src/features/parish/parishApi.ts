import type { Parish } from "@/types";
import { apiFetch } from "@/services/http";
import mtcarmellogo from "@/assets/mtcarmellogo.png";

type ParishPayload = {
  id: string;
  slug: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  seal_url?: string | null;
  tagline?: string | null;
  created_at: string;
  updated_at: string;
};

let cache: Parish[] | null = null;
let inflight: Promise<Parish[]> | null = null;

function toParish(row: ParishPayload): Parish {
  const parish: Parish = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    contact: row.contact,
    email: row.email,
    sealUrl: row.seal_url || undefined,
    tagline: row.tagline || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (parish.slug === "mtcarmel" && !parish.sealUrl) {
    parish.sealUrl = mtcarmellogo;
    parish.tagline = parish.tagline || "Where faith meets history";
  }

  return parish;
}

export async function ensureParishes(): Promise<Parish[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = apiFetch<{ parishes: ParishPayload[] }>("/parishes")
      .then((data) => {
        cache = (data.parishes || []).map(toParish);
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function getParishBySlug(slug: string): Parish | undefined {
  return cache?.find((parish) => parish.slug === slug);
}

export function searchParishes(query: string): Parish[] {
  const list = cache ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (parish) =>
      parish.name.toLowerCase().includes(q) || parish.address.toLowerCase().includes(q)
  );
}
