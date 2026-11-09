import { forwardRef } from "react";
import type { CertificateAppearance } from "@/features/parish-admin/settings/types";
import type { Parish, SacramentType } from "@/types";
import { ParishCertificate } from "@/features/parish-admin/components/certificate/ParishCertificate";
import type { PrintedRecord } from "@/features/parish-admin/components/certificate/certificateData";
import { certificateDataFrom } from "@/features/parish-admin/components/certificate/certificateFromFields";

export { CertificatePreviewStage } from "@/features/parish-admin/components/certificate/CertificatePreviewStage";

export interface CertificateFields {
  requestId: string;
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
  /** The full record as printed (names, sponsors, minister, register line…), ISO dates. */
  printed?: PrintedRecord;
  /** ISO date the certificate was issued; today when absent. */
  issuedOn?: string;
  /** Not yet issued: prints with a "SPECIMEN – NOT VALID" watermark. */
  specimen?: boolean;
}

interface CertificateDocumentProps {
  parish: Parish;
  sacramentType: SacramentType;
  subjectName: string;
  fields: CertificateFields;
  appearance?: CertificateAppearance;
}

/**
 * The printed certificate. Baptism (A5), confirmation and death (Letter) use the parish's
 * printed wording; marriage uses the government's Certificate of Marriage (Municipal Form
 * No. 97, two pages of 8.5 × 13 in). See components/certificate/ParishCertificate.tsx.
 */
export const CertificateDocument = forwardRef<HTMLDivElement, CertificateDocumentProps>(
  function CertificateDocument({ parish, sacramentType, subjectName, fields, appearance }, ref) {
    const data = certificateDataFrom({ parish, sacramentType, subjectName, fields, appearance });
    return <ParishCertificate ref={ref} data={data} appUrl={window.location.origin} />;
  }
);
