import type { ConfirmationRecord, ConfirmationSearchCriteria } from "@/features/parish-admin/records/types";
import {
  fullName,
  parentName,
  recordRef,
} from "@/features/parish-admin/records/baptismalHelpers";

export { recordRef, initials, certStatusTone, annotationTagClass, annotationDotClass } from "@/features/parish-admin/records/baptismalHelpers";

export function recordFullName(rec: ConfirmationRecord) {
  return fullName(rec);
}

export function recordMotherName(rec: ConfirmationRecord) {
  return parentName({ firstName: rec.motherFirstName, lastName: rec.motherLastName });
}

export function recordFatherName(rec: ConfirmationRecord) {
  return parentName({ firstName: rec.fatherFirstName, lastName: rec.fatherLastName });
}

export function filterConfirmationRecords(
  records: ConfirmationRecord[],
  criteria: ConfirmationSearchCriteria
) {
  const name = criteria.name.trim().toLowerCase();
  const birthplace = criteria.birthplace.trim().toLowerCase();
  const mother = criteria.mother.trim().toLowerCase();
  const father = criteria.father.trim().toLowerCase();
  const priest = criteria.priest.trim().toLowerCase();
  const sponsor = criteria.sponsor.trim().toLowerCase();
  const birthdate = criteria.birthdate.trim();

  return records.filter((r) => {
    if (name && !recordFullName(r).toLowerCase().includes(name)) return false;
    if (birthplace && !r.birthplace.toLowerCase().includes(birthplace)) return false;
    if (mother && !recordMotherName(r).toLowerCase().includes(mother)) return false;
    if (father && !recordFatherName(r).toLowerCase().includes(father)) return false;
    if (priest && !r.priest.toLowerCase().includes(priest)) return false;
    if (sponsor && !r.sponsor.toLowerCase().includes(sponsor) && !(r.sponsor2?.toLowerCase().includes(sponsor))) {
      return false;
    }
    if (birthdate) {
      const parsed = Date.parse(r.dob);
      if (!Number.isNaN(parsed)) {
        const iso = new Date(parsed).toISOString().slice(0, 10);
        if (iso !== birthdate) return false;
      }
    }
    return true;
  });
}

export const emptyConfirmationSearchCriteria = (): ConfirmationSearchCriteria => ({
  name: "",
  birthdate: "",
  birthplace: "",
  mother: "",
  father: "",
  priest: "",
  sponsor: "",
});
