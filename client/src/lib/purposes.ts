import type { SacramentType } from "@/types";

/**
 * What each certificate is usually asked for (B2), most common first. Baptism and confirmation copies are mostly
 * for a church wedding; a parish death certificate mostly backs up a benefit or insurance claim. Mirrors
 * server/src/constants/purposes.js. Anything else is typed in with "Other".
 */
export const PURPOSES_BY_SACRAMENT: Record<SacramentType, string[]> = {
  baptism: [
    "Marriage",
    "First Communion or Confirmation",
    "Being a godparent or sponsor",
    "School enrollment",
    "Passport or government ID",
    "Personal records",
  ],
  confirmation: ["Marriage", "Being a godparent or sponsor", "Personal records"],
  marriage: ["Baptism of a child", "Visa or immigration", "Church tribunal case", "Personal records"],
  death: ["Death benefit or insurance claim", "Late registration of death", "Estate settlement", "Personal records"],
};

export const MARRIAGE_PURPOSE = "Marriage";

/** A copy for marriage is accepted for this many months from issue. */
export const MARRIAGE_VALID_MONTHS = 6;

/** The value of the "Other…" choice; the typed purpose is sent instead. */
export const OTHER_PURPOSE = "__other";

export function isMarriagePurpose(value: string | undefined | null) {
  const text = (value ?? "").trim().toLowerCase();
  return text === "marriage" || text === "marriage preparation";
}

/** "2026-11-09" → "2027-05-09"; the last day of a shorter month when the day doesn't exist. */
export function addMonths(isoDate: string, months: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** The last day a marriage copy issued on `issuedOn` is accepted; undefined for other purposes. */
export function validUntilFor(purpose: string | undefined, issuedOn: string) {
  return isMarriagePurpose(purpose) ? addMonths(issuedOn, MARRIAGE_VALID_MONTHS) : undefined;
}
