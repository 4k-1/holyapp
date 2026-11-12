/** The Masses families expect after a funeral (C7), counted with the day of death as day 1. */
export const FOLLOW_UPS = [
  { key: "ninth", label: "9th day", hint: "End of the pasiyam" },
  { key: "fortieth", label: "40th day", hint: "Forty days after death" },
  { key: "anniversary", label: "1st anniversary", hint: "Babang luksa" },
] as const;

export type FollowUpKey = (typeof FOLLOW_UPS)[number]["key"];

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The usual date of each follow-up Mass from the date of death; the office can change it. */
export function followUpDate(key: FollowUpKey, dateOfDeath: string) {
  if (!dateOfDeath) return "";
  if (key === "ninth") return addDays(dateOfDeath, 8);
  if (key === "fortieth") return addDays(dateOfDeath, 39);
  const [y, m, d] = dateOfDeath.split("-");
  // 29 February falls back to 28 February the next year.
  return m === "02" && d === "29" ? `${Number(y) + 1}-02-28` : `${Number(y) + 1}-${m}-${d}`;
}

/** Families usually choose the evening Mass so relatives can come after work. */
export function eveningMass(times: string[]) {
  const evening = times.filter((t) => /PM$/.test(t) && !/^12:/.test(t));
  return evening[evening.length - 1] ?? times[times.length - 1] ?? "";
}
