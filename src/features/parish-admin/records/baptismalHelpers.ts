import type { CertificateFields } from "@/features/parish-admin/components/CertificateDocument";
import type {
  AnnotationCategory,
  BaptismalRecord,
  BaptismalSearchCriteria,
  IssuedCertificateStatus,
  LinkableAnnotationCategory,
  RecordAnnotation,
} from "@/features/parish-admin/records/types";

export function baptismRecordRef(
  rec: Pick<BaptismalRecord, "bookNumber" | "pageNumber" | "entryNumber">
) {
  return `${rec.bookNumber}:${rec.pageNumber}:${rec.entryNumber}`;
}

/** @deprecated Use baptismRecordRef — kept for linked-record display call sites */
export function recordRef(rec: Pick<BaptismalRecord, "bookNumber" | "pageNumber" | "entryNumber">) {
  return baptismRecordRef(rec);
}

export function fullName(parts: { firstName: string; middleName?: string; lastName: string }) {
  return [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(" ");
}

export function parentName(parts: { firstName: string; lastName: string }) {
  return [parts.firstName, parts.lastName].filter(Boolean).join(" ");
}

export function recordFullName(rec: BaptismalRecord) {
  return fullName(rec);
}

export function recordMotherName(rec: BaptismalRecord) {
  return parentName({ firstName: rec.motherFirstName, lastName: rec.motherLastName });
}

export function recordFatherName(rec: BaptismalRecord) {
  return parentName({ firstName: rec.fatherFirstName, lastName: rec.fatherLastName });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatRecordDate(iso: string, empty = "—") {
  if (!iso) return empty;
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

export function filterBaptismalRecords(records: BaptismalRecord[], criteria: BaptismalSearchCriteria) {
  const name = criteria.name.trim().toLowerCase();
  const placeOfBirth = criteria.placeOfBirth.trim().toLowerCase();
  const mother = criteria.mother.trim().toLowerCase();
  const father = criteria.father.trim().toLowerCase();
  const minister = criteria.minister.trim().toLowerCase();
  const placeOfBaptism = criteria.placeOfBaptism.trim().toLowerCase();
  const birthdate = criteria.birthdate.trim();

  return records.filter((r) => {
    if (name && !recordFullName(r).toLowerCase().includes(name)) return false;
    if (placeOfBirth && !(r.placeOfBirth ?? "").toLowerCase().includes(placeOfBirth)) return false;
    if (mother && !recordMotherName(r).toLowerCase().includes(mother)) return false;
    if (father && !recordFatherName(r).toLowerCase().includes(father)) return false;
    if (minister && !r.minister.toLowerCase().includes(minister)) return false;
    if (placeOfBaptism && !r.placeOfBaptism.toLowerCase().includes(placeOfBaptism)) return false;
    if (birthdate && r.dateOfBirth !== birthdate) return false;
    return true;
  });
}

export const annotationTagClass: Record<AnnotationCategory, string> = {
  Confirmation: "bg-[#E3E8F5] text-[#3B4E8A]",
  Marriage: "bg-admin-gold-100 text-admin-gold-700",
  Death: "bg-admin-surface-alt text-admin-ink-muted",
  Other: "bg-admin-green-100 text-admin-green-700",
};

export const annotationDotClass: Record<AnnotationCategory, string> = {
  Confirmation: "bg-[#3B4E8A]",
  Marriage: "bg-admin-gold-600",
  Death: "bg-admin-ink-faint",
  Other: "bg-admin-green-700",
};

export function certStatusTone(status: IssuedCertificateStatus): "green" | "amber" | "red" {
  if (status === "Valid") return "green";
  if (status === "Superseded") return "amber";
  return "red";
}

export function annotationTime(date: string) {
  const parsed = Date.parse(date.includes("T") ? date : `${date}T12:00:00`);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function linkedRegisterRef(linked: { book: string; page: string; line?: string }) {
  return [`Book ${linked.book}`, `Page ${linked.page}`, linked.line ? `Line ${linked.line}` : null]
    .filter(Boolean)
    .join(" / ");
}

export function baptismCertificateDisplayRef(
  rec: Pick<BaptismalRecord, "bookNumber" | "pageNumber" | "entryNumber">
) {
  return `Book ${rec.bookNumber}, Page ${rec.pageNumber}, Entry ${rec.entryNumber}`;
}

const CERTIFICATE_NOTATION: Record<LinkableAnnotationCategory, (date: string) => string> = {
  Confirmation: (date) => `Notation: Confirmed on ${date}.`,
  Marriage: (date) => `Notation: Married on ${date}.`,
  Death: (date) => `Notation: Died on ${date}.`,
};

export function baptismCertificateNotationLine(
  annotation: Pick<RecordAnnotation, "category" | "date" | "note">
) {
  if (annotation.category === "Other") {
    const note = annotation.note.trim();
    return note ? `Notation: ${note}` : "";
  }
  return CERTIFICATE_NOTATION[annotation.category](annotation.date);
}

export function baptismCertificateNotations(annotations: RecordAnnotation[]) {
  return [...annotations]
    .sort((a, b) => annotationTime(a.date) - annotationTime(b.date))
    .map(baptismCertificateNotationLine)
    .filter(Boolean);
}

export function baptismCertificateFields(
  rec: BaptismalRecord,
  extras?: { requestId?: string; certCode?: string }
): CertificateFields {
  return {
    requestId: extras?.requestId ?? rec.id,
    registerRef: baptismCertificateDisplayRef(rec),
    birthdate: formatRecordDate(rec.dateOfBirth),
    birthplace: rec.placeOfBirth ?? "—",
    baptismDate: formatRecordDate(rec.dateOfBaptism),
    motherName: recordMotherName(rec),
    fatherName: recordFatherName(rec),
    certCode: extras?.certCode,
    notations: baptismCertificateNotations(rec.annotations ?? []),
  };
}

export const emptySearchCriteria = (): BaptismalSearchCriteria => ({
  name: "",
  birthdate: "",
  placeOfBirth: "",
  mother: "",
  father: "",
  minister: "",
  placeOfBaptism: "",
});
