import type { CertificateFields } from "@/features/parish-admin/components/CertificateDocument";
import type { ConfirmationRecord, ConfirmationSearchCriteria } from "@/features/parish-admin/records/types";
import { certificateRegisterRef, formatRecordDate as formatSharedDate, fullName, parentName } from "@/features/parish-admin/records/baptismalHelpers";

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

export function filterConfirmationRecords(
  records: ConfirmationRecord[],
  criteria: ConfirmationSearchCriteria
) {
  const name = criteria.name.trim().toLowerCase();
  const address = criteria.address.trim().toLowerCase();
  const mother = criteria.mother.trim().toLowerCase();
  const father = criteria.father.trim().toLowerCase();
  const minister = criteria.minister.trim().toLowerCase();
  const birthdate = criteria.birthdate.trim();

  return records.filter((r) => {
    if (name && !recordFullName(r).toLowerCase().includes(name)) return false;
    if (address && !(r.address ?? "").toLowerCase().includes(address)) return false;
    if (mother && !recordMotherName(r).toLowerCase().includes(mother)) return false;
    if (father && !recordFatherName(r).toLowerCase().includes(father)) return false;
    if (minister && !(r.minister ?? "").toLowerCase().includes(minister)) return false;
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
});

export function confirmationCertificateFields(
  rec: ConfirmationRecord,
  extras?: { requestId?: string; certCode?: string }
): CertificateFields {
  const mother = recordMotherName(rec);
  const father = recordFatherName(rec);
  return {
    requestId: extras?.requestId ?? rec.id,
    registerRef: certificateRegisterRef(rec),
    birthdate: rec.dateOfBirth ? formatSharedDate(rec.dateOfBirth) : undefined,
    confirmationDate: formatSharedDate(rec.dateOfConfirmation),
    motherName: mother || undefined,
    fatherName: father || undefined,
    certCode: extras?.certCode,
    printed: {
      type: "CONFIRMATION",
      personConfirmed: recordFullName(rec),
      address: rec.address,
      placeOfBaptism: rec.baptismPlace,
      fatherName: father || undefined,
      motherName: mother || undefined,
      // Sponsors aren't recorded for confirmations yet.
      sponsors: [],
      minister: rec.minister,
      dateConfirmed: rec.dateOfConfirmation,
      bookNo: rec.bookNumber,
      pageNo: rec.pageNumber,
      lineNo: rec.entryNumber,
    },
  };
}
