import type { MarriageRecord, MarriageSearchCriteria } from "@/features/parish-admin/records/types";
import { fullName, initials } from "@/features/parish-admin/records/baptismalHelpers";

export { initials, certStatusTone } from "@/features/parish-admin/records/baptismalHelpers";

export function marriageRecordRef(
  rec: Pick<MarriageRecord, "bookNumber" | "pageNumber" | "entryNumber">
) {
  return `${rec.bookNumber}:${rec.pageNumber}:${rec.entryNumber}`;
}

export function groomFullName(rec: MarriageRecord) {
  return fullName({
    firstName: rec.groomFirstName,
    middleName: rec.groomMiddleName,
    lastName: rec.groomLastName,
  });
}

export function brideFullName(rec: MarriageRecord) {
  return fullName({
    firstName: rec.brideFirstName,
    middleName: rec.brideMiddleName,
    lastName: rec.brideLastName,
  });
}

export function coupleLabel(rec: MarriageRecord) {
  return `${groomFullName(rec)} & ${brideFullName(rec)}`;
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

export function filterMarriageRecords(records: MarriageRecord[], criteria: MarriageSearchCriteria) {
  const groom = criteria.groom.trim().toLowerCase();
  const bride = criteria.bride.trim().toLowerCase();
  const place = criteria.place.trim().toLowerCase();
  const witness = criteria.witness.trim().toLowerCase();
  const minister = criteria.minister.trim().toLowerCase();
  const marriageDate = criteria.marriageDate.trim();

  return records.filter((r) => {
    if (groom && !groomFullName(r).toLowerCase().includes(groom)) return false;
    if (bride && !brideFullName(r).toLowerCase().includes(bride)) return false;
    if (place && !r.placeOfMarriage.toLowerCase().includes(place)) return false;
    if (
      witness &&
      !r.witnessOne.toLowerCase().includes(witness) &&
      !r.witnessTwo.toLowerCase().includes(witness)
    ) {
      return false;
    }
    if (minister && !r.minister.toLowerCase().includes(minister)) return false;
    if (marriageDate && r.dateOfMarriage !== marriageDate) return false;
    return true;
  });
}

export const emptyMarriageSearchCriteria = (): MarriageSearchCriteria => ({
  groom: "",
  bride: "",
  marriageDate: "",
  place: "",
  witness: "",
  minister: "",
});
