// Name search that doesn't depend on typing the whole name exactly as stored.
// Every word typed must appear somewhere in the name, in any order, so
// "Juan Cruz" finds "Juan Santos Dela Cruz" (middle name left out) and
// "Cruz Juan" finds it too. Case, accents ("Pena" ↔ "Peña") and punctuation
// ("Ma." ↔ "Ma") are ignored.

export function normalizeForSearch(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,'’-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchWords(query: string | undefined | null) {
  const normalized = normalizeForSearch(query);
  return normalized ? normalized.split(" ") : [];
}

/** True when every word of the query appears in the name. An empty query matches everything. */
export function nameMatchesQuery(query: string | undefined | null, name: string | undefined | null) {
  const words = searchWords(query);
  if (words.length === 0) return true;
  const nameWords = searchWords(name);
  // Each typed word must start some word of the name: "jua" finds "Juan",
  // but "an" doesn't find every "Juan", "Santos" and "Fernandez".
  return words.every((word) => nameWords.some((nameWord) => nameWord.startsWith(word)));
}
