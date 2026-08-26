import type { CertificateFields } from "@/features/parish-admin/components/CertificateDocument";
import type {
  MarriageConsentPerson,
  MarriageParty,
  MarriagePartyRole,
  MarriageRecord,
  MarriageSearchCriteria,
} from "@/features/parish-admin/records/types";
import { certificateRegisterRef, formatRecordDate as formatSharedDate, fullName, initials } from "@/features/parish-admin/records/baptismalHelpers";

export { initials, certStatusTone } from "@/features/parish-admin/records/baptismalHelpers";

export function marriageRecordRef(
  rec: Pick<MarriageRecord, "bookNumber" | "pageNumber" | "entryNumber">
) {
  return `${rec.bookNumber}:${rec.pageNumber}:${rec.entryNumber}`;
}

export function getMarriageParty(
  rec: MarriageRecord,
  role: MarriagePartyRole
): MarriageParty | undefined {
  return rec.parties.find((p) => p.role === role);
}

export function partyFullName(party: Pick<MarriageParty, "firstName" | "middleName" | "lastName">) {
  return fullName({
    firstName: party.firstName,
    middleName: party.middleName,
    lastName: party.lastName,
  });
}

export function groomFullName(rec: MarriageRecord) {
  const groom = getMarriageParty(rec, "Groom");
  return groom ? partyFullName(groom) : "—";
}

export function brideFullName(rec: MarriageRecord) {
  const bride = getMarriageParty(rec, "Bride");
  return bride ? partyFullName(bride) : "—";
}

export function coupleLabel(rec: MarriageRecord) {
  return `${groomFullName(rec)} & ${brideFullName(rec)}`;
}

export function parentName(parts: {
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
}) {
  return [parts.firstName, parts.middleInitial ? `${parts.middleInitial}.` : "", parts.lastName]
    .filter(Boolean)
    .join(" ");
}

export function consentPersonName(person: MarriageConsentPerson) {
  return parentName({
    firstName: person.firstName,
    lastName: person.lastName,
    middleInitial: person.middleInitial,
  });
}

export function formatRecordDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function calcAgeAt(dob: string, asOf: string): number | null {
  if (!dob || !asOf) return null;
  const b = new Date(dob.includes("T") ? dob : `${dob}T00:00:00`);
  const a = new Date(asOf.includes("T") ? asOf : `${asOf}T00:00:00`);
  if (Number.isNaN(b.getTime()) || Number.isNaN(a.getTime())) return null;
  let age = a.getFullYear() - b.getFullYear();
  const monthDiff = a.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && a.getDate() < b.getDate())) age--;
  return age >= 0 ? age : null;
}

export function formatRecordTime(time: string) {
  if (!time) return "—";
  const [h, m] = time.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
});

export function marriageCertificateFields(
  rec: MarriageRecord,
  extras?: { requestId?: string; certCode?: string }
): CertificateFields {
  return {
    requestId: extras?.requestId ?? rec.id,
    registerRef: certificateRegisterRef(rec),
    marriageDate: formatSharedDate(rec.dateOfMarriage),
    certCode: extras?.certCode,
  };
}
