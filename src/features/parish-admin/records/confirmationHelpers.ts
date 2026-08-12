import type { ConfirmationRecord, ConfirmationSearchCriteria } from "@/features/parish-admin/records/types";
import { fullName, initials, parentName } from "@/features/parish-admin/records/baptismalHelpers";

export { initials, certStatusTone } from "@/features/parish-admin/records/baptismalHelpers";

export function confirmationRecordRef(
  rec: Pick<ConfirmationRecord, "bookNumber" | "pageNumber" | "entryNumber">
) {
  return `${rec.bookNumber}:${rec.pageNumber}:${rec.entryNumber}`;
}

export function recordFullName(rec: ConfirmationRecord) {
  return fullName(rec);
}

export function recordMotherName(rec: ConfirmationRecord) {
  return parentName({
    firstName: rec.motherFirstName ?? "",
    lastName: rec.motherLastName ?? "",
  });
}

export function recordFatherName(rec: ConfirmationRecord) {
  return parentName({
    firstName: rec.fatherFirstName ?? "",
    lastName: rec.fatherLastName ?? "",
  });
}

export function formatRecordDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STAFF_NAMES: Record<string, string> = {
  "u-admin": "Admin Immaculada",
  "u-super": "Super Admin",
};

export function encodedByLabel(userId: string) {
  return STAFF_NAMES[userId] ?? userId;
}

export function filterConfirmationRecords(
  records: ConfirmationRecord[],
  criteria: ConfirmationSearchCriteria
) {
  const name = criteria.name.trim().toLowerCase();
  const address = criteria.address.trim().toLowerCase();
  const mother = criteria.mother.trim().toLowerCase();
  const father = criteria.father.trim().toLowerCase();
  const minister = criteria.minister.trim().toLowerCase();
  const place = criteria.place.trim().toLowerCase();
  const birthdate = criteria.birthdate.trim();

  return records.filter((r) => {
    if (name && !recordFullName(r).toLowerCase().includes(name)) return false;
    if (address && !(r.address ?? "").toLowerCase().includes(address)) return false;
    if (mother && !recordMotherName(r).toLowerCase().includes(mother)) return false;
    if (father && !recordFatherName(r).toLowerCase().includes(father)) return false;
    if (minister && !r.minister.toLowerCase().includes(minister)) return false;
    if (place && !r.placeOfConfirmation.toLowerCase().includes(place)) return false;
    if (birthdate && r.dateOfBirth !== birthdate) return false;
    return true;
  });
}

export const emptyConfirmationSearchCriteria = (): ConfirmationSearchCriteria => ({
  name: "",
  birthdate: "",
  address: "",
  mother: "",
  father: "",
  minister: "",
  place: "",
});
