import type {
  AnnotationCategory,
  BaptismalRecord,
  BaptismalSearchCriteria,
  IssuedCertificateStatus,
} from "@/features/parish-admin/records/types";

export function recordRef(rec: Pick<BaptismalRecord, "book" | "page" | "line">) {
  return `${rec.book}:${rec.page}:${rec.line || "—"}`;
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

export function filterBaptismalRecords(records: BaptismalRecord[], criteria: BaptismalSearchCriteria) {
  const name = criteria.name.trim().toLowerCase();
  const birthplace = criteria.birthplace.trim().toLowerCase();
  const mother = criteria.mother.trim().toLowerCase();
  const father = criteria.father.trim().toLowerCase();
  const priest = criteria.priest.trim().toLowerCase();
  const birthdate = criteria.birthdate.trim();

  return records.filter((r) => {
    if (name && !recordFullName(r).toLowerCase().includes(name)) return false;
    if (birthplace && !r.birthplace.toLowerCase().includes(birthplace)) return false;
    if (mother && !recordMotherName(r).toLowerCase().includes(mother)) return false;
    if (father && !recordFatherName(r).toLowerCase().includes(father)) return false;
    if (priest && !r.priest.toLowerCase().includes(priest)) return false;
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

export const emptySearchCriteria = (): BaptismalSearchCriteria => ({
  name: "",
  birthdate: "",
  birthplace: "",
  mother: "",
  father: "",
  priest: "",
});
