/** A date as tables show it: "Nov 10, 2026". Takes a plain date ("2026-11-10") or a timestamp. */
export function formatTableDate(iso: string | null | undefined, empty = "—") {
  if (!iso) return empty;
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
