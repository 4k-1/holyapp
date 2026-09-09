import { MOCK_PARISHES } from "@/services/mocks/parishes.mock";
import type { Parish } from "@/types";

export function getParishBySlug(slug: string): Parish | undefined {
  return MOCK_PARISHES.find((p) => p.slug === slug);
}

export function searchParishes(query: string): Parish[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOCK_PARISHES;
  return MOCK_PARISHES.filter(
    (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
  );
}
