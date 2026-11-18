/** True when any search field has something in it. */
export function hasCriteria(criteria: object) {
  return Object.values(criteria).some((value) => typeof value === "string" && value.trim() !== "");
}

/** Where an entry sits in the paper register. Every record type can be searched by it. */
export interface RegisterCriteria {
  book: string;
  page: string;
  entry: string;
}

export const emptyRegisterCriteria = (): RegisterCriteria => ({ book: "", page: "", entry: "" });

// "007" and "7" are the same book; letters (e.g. "12-A") are compared as typed, ignoring case.
const registerKey = (value: string | number | null | undefined) =>
  String(value ?? "").trim().toLowerCase().replace(/^0+(?=\d)/, "");

/** True when the record's book, page and entry match every one that was filled in. */
export function matchesRegister(
  record: { bookNumber?: string | number | null; pageNumber?: string | number | null; entryNumber?: string | number | null },
  criteria: RegisterCriteria
) {
  const pairs: [string, string | number | null | undefined][] = [
    [criteria.book, record.bookNumber],
    [criteria.page, record.pageNumber],
    [criteria.entry, record.entryNumber],
  ];
  return pairs.every(([wanted, actual]) => !wanted.trim() || registerKey(wanted) === registerKey(actual));
}
