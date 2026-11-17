import { nameMatchesQuery } from "@/lib/nameSearch";
import type { CertificateFields } from "@/features/parish-admin/components/CertificateDocument";
import type {
  DeathRecord,
  DeathSacramentName,
  DeathSearchCriteria,
} from "@/features/parish-admin/records/types";
import { certificateRegisterRef, formatRecordDate as formatSharedDate, fullName } from "@/features/parish-admin/records/baptismalHelpers";

export { initials, certStatusTone } from "@/features/parish-admin/records/baptismalHelpers";

export function deathRecordRef(
  rec: Pick<DeathRecord, "bookNumber" | "pageNumber" | "entryNumber">
) {
  return `${rec.bookNumber}:${rec.pageNumber}:${rec.entryNumber}`;
}

export function recordFullName(rec: Pick<DeathRecord, "firstName" | "middleName" | "lastName">) {
  return fullName(rec);
}

export function kinFullName(kin: { firstName?: string; middleName?: string; lastName?: string }) {
  return [kin.firstName, kin.middleName, kin.lastName].filter(Boolean).join(" ") || "—";
}

export const DEATH_SACRAMENT_LABELS: Record<DeathSacramentName, string> = {
  last_rites: "Last Rites",
  burial_mass: "Burial Mass",
  confession: "Confession",
  communion: "Communion",
};

export function formatAge(record: Pick<DeathRecord, "age" | "ageMonths" | "ageDays">) {
  const parts: string[] = [];
  if (record.age != null && record.age > 0) parts.push(`${record.age} year${record.age === 1 ? "" : "s"}`);
  if (record.ageMonths != null && record.ageMonths > 0) {
    parts.push(`${record.ageMonths} month${record.ageMonths === 1 ? "" : "s"}`);
  }
  if (record.ageDays != null && record.ageDays > 0) {
    parts.push(`${record.ageDays} day${record.ageDays === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) {
    if (record.age === 0) return "Less than 1 year";
    return "—";
  }
  return parts.join(", ");
}

export { formatRecordDate } from "@/features/parish-admin/records/baptismalHelpers";

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

export function filterDeathRecords(records: DeathRecord[], criteria: DeathSearchCriteria) {
  const name = criteria.name.trim().toLowerCase();
  const minister = criteria.minister.trim().toLowerCase();
  const residence = criteria.residence.trim().toLowerCase();
  const dateOfDeath = criteria.dateOfDeath.trim();
  const dateOfBurial = criteria.dateOfBurial.trim();

  return records.filter((r) => {
    if (!nameMatchesQuery(name, recordFullName(r))) return false;
    if (minister && !(r.minister ?? "").toLowerCase().includes(minister)) return false;
    if (residence && !(r.residence ?? "").toLowerCase().includes(residence)) return false;
    if (dateOfDeath && r.dateOfDeath !== dateOfDeath) return false;
    if (dateOfBurial && r.dateOfBurial !== dateOfBurial) return false;
    return true;
  });
}

export const emptyDeathSearchCriteria = (): DeathSearchCriteria => ({
  name: "",
  dateOfDeath: "",
  dateOfBurial: "",
  minister: "",
  residence: "",
});

export const DEATH_SACRAMENT_OPTIONS: DeathSacramentName[] = [
  "last_rites",
  "burial_mass",
  "confession",
  "communion",
];

export function deathCertificateFields(
  rec: DeathRecord,
  extras?: { requestId?: string; certCode?: string }
): CertificateFields {
  return {
    requestId: extras?.requestId ?? rec.id,
    registerRef: certificateRegisterRef(rec),
    deathDate: formatSharedDate(rec.dateOfDeath),
    certCode: extras?.certCode,
    printed: {
      type: "DEATH",
      nameOfDeceased: recordFullName(rec),
      ageYears: rec.age,
      ageMonths: rec.ageMonths,
      ageDays: rec.ageDays,
      fatherName: kinNamed(rec, "father"),
      motherName: kinNamed(rec, "mother"),
      address: rec.residence,
      dateOfDeath: rec.dateOfDeath,
      dateOfBurial: rec.dateOfBurial,
      placeOfBurial: rec.placeOfBurial,
      minister: rec.minister,
      bookNo: rec.bookNumber,
      pageNo: rec.pageNumber,
      lineNo: rec.entryNumber,
    },
  };
}

/** Parents are kept only as next-of-kin rows whose relation is typed by hand ("Father"). */
function kinNamed(rec: DeathRecord, relation: "father" | "mother") {
  const kin = (rec.kin ?? []).find((k) => k.relationToDeceased.trim().toLowerCase() === relation);
  return kin ? [kin.firstName, kin.lastName].filter(Boolean).join(" ") || undefined : undefined;
}
