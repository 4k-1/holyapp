/**
 * Data for the printed parish certificates (ParishCertificate). One type per certificate,
 * joined by `type`. Every value the parish might not have is optional: the template prints
 * a blank underline for it, never "null" or "undefined".
 *
 * Dates are ISO calendar dates ("2026-10-23"). The template writes them out in full
 * ("23rd day of October 2026").
 */

export type CertificateType = "BAPTISM" | "CONFIRMATION" | "DEATH" | "MARRIAGE";

/**
 * Paper size each certificate is printed on. LONG is 8.5 × 13 in ("long bond"), the size of
 * the government's Certificate of Marriage (Municipal Form No. 97).
 */
export const CERTIFICATE_PAPER: Record<CertificateType, "A5" | "LETTER" | "LONG"> = {
  BAPTISM: "A5",
  CONFIRMATION: "LETTER",
  DEATH: "LETTER",
  MARRIAGE: "LONG",
};

/** The parish header, always taken from the tenant's parish settings. */
export interface CertificateParish {
  name: string;
  /** Street address line under the name. */
  address?: string;
  /** Town or city named in the "Issued … at [Parish], [City]" line. */
  city?: string;
  logoUrl?: string;
}

/** Who signs: from the certificate settings, or the issuing staff's assigned priest. */
export interface CertificateSignatory {
  name?: string;
  /** e.g. "Parish Priest". */
  title?: string;
}

export interface CertificateVerification {
  /** Id the public /verify page looks the certificate up by: the QR encodes `{appUrl}/verify/{certificateId}`. */
  certificateId?: string;
  /** A ready-made verify link, used instead of building one from `certificateId`. */
  url?: string;
  /** Certificate No. / Control No. printed beside the QR code. */
  controlNo?: string;
  /** Full SHA-256 hex digest of the issued certificate; only the first 16 characters print. */
  hash?: string;
}

interface CertificateBase {
  parish: CertificateParish;
  signatory: CertificateSignatory;
  /** Date the certificate is issued. */
  issuedOn: string;
  /**
   * Absent while previewing: the QR area then shows a "QR CODE" placeholder of the same size.
   */
  verification?: CertificateVerification;
  /** A preview of a copy not yet issued: printed with a "SPECIMEN – NOT VALID" watermark. */
  specimen?: boolean;
  /** What the copy is for (B2), printed under the QR code. */
  purpose?: string;
  /** Marriage copies: the last day it is accepted (ISO date). */
  validUntil?: string;
}

export interface BaptismCertificateData extends CertificateBase {
  type: "BAPTISM";
  childName: string;
  fatherName?: string;
  motherName?: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  dateOfBaptism?: string;
  /** "Rev. " is printed by the template. */
  minister?: string;
  /** Printed two per line. The printed form leaves room for four. */
  sponsors: string[];
  bookNo?: string;
  pageNo?: string;
  lineNo?: string;
  /** Marriage, confirmation and other notes. The line is hidden when there are none. */
  remarks?: string[];
}

export interface ConfirmationCertificateData extends CertificateBase {
  type: "CONFIRMATION";
  personConfirmed: string;
  parishOfOrigin?: string;
  address?: string;
  placeOfBaptism?: string;
  fatherName?: string;
  motherName?: string;
  sponsors: string[];
  minister?: string;
  dateConfirmed?: string;
  bookNo?: string;
  pageNo?: string;
  lineNo?: string;
}

export type CertificateSex = "male" | "female";

export interface DeathCertificateData extends CertificateBase {
  type: "DEATH";
  nameOfDeceased: string;
  /** Picks "Son of" or "Daughter of"; unknown prints "Son/Daughter of". */
  sex?: CertificateSex;
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  fatherName?: string;
  motherName?: string;
  address?: string;
  dateOfDeath?: string;
  dateOfBurial?: string;
  placeOfBurial?: string;
  minister?: string;
  bookNo?: string;
  pageNo?: string;
  lineNo?: string;
}

/** A name printed in the form's (First) (Middle) (Last) columns. */
export interface FormName {
  first?: string;
  middle?: string;
  last?: string;
}

/** One column (husband or wife) of the Certificate of Marriage, items 1 to 14. */
export interface MarriageCertificateParty {
  name: FormName;
  dateOfBirth?: string;
  /** Age on the date of marriage. Worked out from the two dates when absent. */
  age?: number;
  /** The register keeps one line; it prints across the City/Province/Country boxes. */
  placeOfBirth?: string;
  sex?: string;
  citizenship?: string;
  residence?: string;
  religion?: string;
  civilStatus?: string;
  father: FormName;
  fatherCitizenship?: string;
  /** Item 10: the mother's maiden name. */
  mother: FormName;
  motherCitizenship?: string;
  /** Items 12 to 14: the person (or wali) who gave consent or advice, if any. */
  consent?: {
    name: FormName;
    relationship?: string;
    residence?: string;
  };
}

/**
 * The Certificate of Marriage, Municipal Form No. 97 (Revised August 2016), on 8.5 × 13 in.
 * It prints the government's wording, so it has no parish header or signatory: the parish
 * name and the register line go in the verification strip under page 2.
 */
export interface MarriageCertificateData extends CertificateBase {
  type: "MARRIAGE";
  /** Form header. Assigned by the civil registrar; usually blank when the parish prints it. */
  province?: string;
  cityMunicipality?: string;
  registryNo?: string;
  husband: MarriageCertificateParty;
  wife: MarriageCertificateParty;
  /** Item 15: church, chapel or other place. */
  placeOfMarriage?: string;
  /** Item 15: the place's address; prints across the City/Municipality and Province boxes. */
  marriageAddress?: string;
  dateOfMarriage?: string;
  /** "16:30" (24-hour) or "4:30 PM". */
  timeOfMarriage?: string;
  /** Item 19 */
  solemnizingOfficer?: string;
  officerPosition?: string;
  /** "Religion/Religious Sect, Registry No. and Expiration Date". */
  officerReligion?: string;
  marriageLicenseNo?: string;
  marriageLicenseIssuedOn?: string;
  marriageLicenseIssuedAt?: string;
  /** Item 20a (four on page 1) and 20b (eight more on page 2). */
  witnesses: string[];
  bookNo?: string;
  pageNo?: string;
  lineNo?: string;
}

export type CertificateData =
  | BaptismCertificateData
  | ConfirmationCertificateData
  | DeathCertificateData
  | MarriageCertificateData;

/** The record part of each certificate: what is copied from the register when it is issued. */
type RecordPart<T> = Omit<T, "parish" | "signatory" | "issuedOn" | "verification">;

export type PrintedRecord =
  | RecordPart<BaptismCertificateData>
  | RecordPart<ConfirmationCertificateData>
  | RecordPart<DeathCertificateData>
  | RecordPart<MarriageCertificateData>;
