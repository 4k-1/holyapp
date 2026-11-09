const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd". */
export function ordinal(n: number) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

/** "2026-10-23" → { day: "23rd", month: "October", year: "2026" }. Anything else → undefined. */
export function dateParts(iso: string | undefined): DateParts | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso?.trim() ?? "");
  if (!match) return undefined;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return { day: ordinal(day), month: MONTHS[month - 1], year: match[1] };
}

/** "2026-10-23" → "23rd day of October 2026". */
export function fullDate(iso: string | undefined) {
  const parts = dateParts(iso);
  return parts ? `${parts.day} day of ${parts.month} ${parts.year}` : undefined;
}

/** Placeholders other screens use for "no value"; on paper they become a blank line. */
const EMPTY_MARKS = new Set(["null", "undefined", "—", "-", "–", "N/A", "n/a"]);

/** Trimmed text, or undefined when there is nothing to print. */
export function present(value: string | number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text && !EMPTY_MARKS.has(text) ? text : undefined;
}

/** "78 years old", "3 months and 12 days old". */
export function ageText(years?: number, months?: number, days?: number) {
  const parts: string[] = [];
  const add = (n: number | undefined, unit: string) => {
    if (n === undefined || n === null || Number.isNaN(n) || n < 0) return;
    if (n === 0 && parts.length === 0 && unit !== "day") return;
    parts.push(`${n} ${unit}${n === 1 ? "" : "s"}`);
  };
  add(years, "year");
  if (!years) {
    add(months, "month");
    add(days, "day");
  }
  if (parts.length === 0) return undefined;
  return `${parts.join(" and ")} old`;
}

/** First `length` characters of a hex digest, for the caption beside the QR code. */
export function shortHash(hash: string | undefined, length = 16) {
  const text = present(hash);
  return text ? text.slice(0, length).toUpperCase() : undefined;
}

/** `{APP_URL}/verify/{certificateId}`. */
export function verifyUrl(appUrl: string, certificateId: string) {
  return `${appUrl.replace(/\/+$/, "")}/verify/${encodeURIComponent(certificateId)}`;
}
