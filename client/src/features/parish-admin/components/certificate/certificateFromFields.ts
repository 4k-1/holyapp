import type { CertificateAppearance } from "@/features/parish-admin/settings/types";
import type { Parish, SacramentType } from "@/types";
import type { CertificateData, CertificateVerification, PrintedRecord } from "./certificateData";
import { present } from "./certificateFormat";

/** What the existing certificate screens pass around (see CertificateFields). */
export interface LegacyCertificateFields {
  registerRef: string;
  birthdate?: string;
  birthplace?: string;
  baptismDate?: string;
  confirmationDate?: string;
  marriageDate?: string;
  deathDate?: string;
  motherName?: string;
  fatherName?: string;
  certCode?: string;
  notations?: string[];
  verifyUrl?: string;
  printed?: PrintedRecord;
  issuedOn?: string;
}

const TYPE_FOR: Record<SacramentType, PrintedRecord["type"]> = {
  baptism: "BAPTISM",
  confirmation: "CONFIRMATION",
  marriage: "MARRIAGE",
  death: "DEATH",
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "1998-04-12", "April 12, 1998" or a timestamp → "1998-04-12". */
export function toIsoDate(value: string | undefined): string | undefined {
  const text = present(value);
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "12:48:16" or "Book 12, Page 48, Entry 16" → its parts. */
function registerParts(ref: string | undefined) {
  const text = present(ref) ?? "";
  const named = /Book\s+([^,]*),\s*Page\s+([^,]*),\s*(?:Entry|Line)\s+(.*)$/i.exec(text);
  const parts = named ? named.slice(1) : text.split(":");
  const [bookNo, pageNo, lineNo] = parts.map((p) => present(p));
  return parts.length === 3 ? { bookNo, pageNo, lineNo } : {};
}

/** The verify page's code is the last part of the verify link (a hex hash). */
function hashFromUrl(url: string | undefined) {
  const last = present(url)?.split("/").pop();
  return last && /^[a-f0-9]{16,}$/i.test(last) ? last : undefined;
}

/**
 * Builds the record part from the older, display-formatted fields. Used for certificates
 * issued before the full record was saved with them, and for request previews with no
 * linked record yet.
 */
function recordFromLegacy(
  type: PrintedRecord["type"],
  subjectName: string,
  fields: LegacyCertificateFields
): PrintedRecord {
  const register = registerParts(fields.registerRef);
  if (type === "BAPTISM") {
    return {
      type,
      childName: subjectName,
      fatherName: fields.fatherName,
      motherName: fields.motherName,
      placeOfBirth: fields.birthplace,
      dateOfBirth: toIsoDate(fields.birthdate),
      dateOfBaptism: toIsoDate(fields.baptismDate),
      sponsors: [],
      remarks: fields.notations,
      ...register,
    };
  }
  if (type === "CONFIRMATION") {
    return {
      type,
      personConfirmed: subjectName,
      fatherName: fields.fatherName,
      motherName: fields.motherName,
      sponsors: [],
      dateConfirmed: toIsoDate(fields.confirmationDate),
      ...register,
    };
  }
  if (type === "MARRIAGE") {
    // Older marriage certificates only kept "Groom and Bride" and the date.
    const [husband, wife] = subjectName.split(/\s+(?:and|&)\s+/i);
    return {
      type,
      husband: { name: { first: present(husband) }, father: {}, mother: {} },
      wife: { name: { first: present(wife) }, father: {}, mother: {} },
      dateOfMarriage: toIsoDate(fields.marriageDate),
      witnesses: [],
      ...register,
    };
  }
  return {
    type,
    nameOfDeceased: subjectName,
    fatherName: fields.fatherName,
    motherName: fields.motherName,
    dateOfDeath: toIsoDate(fields.deathDate),
    ...register,
  };
}

/**
 * Everything ParishCertificate needs: the parish (header, or the strip under Form 97) from the tenant's settings, the
 * signatory from the certificate settings, and the record (saved with the certificate, or
 * rebuilt from the older fields). Without a code or verify link it is a preview: the QR
 * area shows its placeholder.
 */
export function certificateDataFrom({
  parish,
  sacramentType,
  subjectName,
  fields,
  appearance,
}: {
  parish: Parish;
  sacramentType: SacramentType;
  subjectName: string;
  fields: LegacyCertificateFields;
  appearance?: CertificateAppearance;
}): CertificateData {
  const type = TYPE_FOR[sacramentType];
  const record = fields.printed?.type === type ? fields.printed : recordFromLegacy(type, subjectName, fields);

  const verifyUrl = present(fields.verifyUrl);
  const controlNo = present(fields.certCode);
  const verification: CertificateVerification | undefined =
    verifyUrl || controlNo ? { url: verifyUrl, controlNo, hash: hashFromUrl(verifyUrl) } : undefined;

  return {
    ...record,
    parish: { name: parish.name, address: parish.address, logoUrl: parish.sealUrl },
    signatory: { name: appearance?.signatoryName, title: appearance?.signatoryTitle },
    issuedOn: toIsoDate(fields.issuedOn) ?? todayIso(),
    verification,
  } as CertificateData;
}
