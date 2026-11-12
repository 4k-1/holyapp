import type { CertificateFields } from "@/features/parish-admin/components/CertificateDocument";
import type { SacramentType } from "@/types";
import type { PrintedRecord } from "./certificateData";
import { CERTIFICATE_SAMPLES } from "./certificateMocks";

/** The typical dummy record for a printed template, without its issue date or QR details. */
function samplePrinted(type: keyof typeof CERTIFICATE_SAMPLES): PrintedRecord {
  const { issuedOn: _issuedOn, verification: _verification, ...record } = CERTIFICATE_SAMPLES[type][0].data;
  return record as PrintedRecord;
}

export const SAMPLE_CERTIFICATE: Record<
  SacramentType,
  { name: string; fields: Omit<CertificateFields, "certCode"> }
> = {
  baptism: {
    name: "Maria Teresa Dela Cruz Santos",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 12, Page 48, Entry 16",
      birthdate: "April 12, 1998",
      birthplace: "Cebu City",
      baptismDate: "April 26, 1998",
      motherName: "Ana Marie Santos",
      fatherName: "Roberto Santos",
      printed: samplePrinted("BAPTISM"),
    },
  },
  confirmation: {
    name: "Miguel Angel Reyes Torres",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 4, Page 21, Entry 8",
      birthdate: "August 3, 2009",
      birthplace: "Cebu City",
      confirmationDate: "May 18, 2024",
      motherName: "Lourdes Torres",
      fatherName: "Paolo Torres",
      printed: samplePrinted("CONFIRMATION"),
    },
  },
  marriage: {
    name: "Juan Miguel Reyes Cruz and Maria Teresa Dela Cruz Santos",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 7, Page 11, Entry 3",
      marriageDate: "June 14, 2022",
      printed: samplePrinted("MARRIAGE"),
    },
  },
  death: {
    name: "Rosario Elena Bautista Vda. de Mercado",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 3, Page 9, Entry 2",
      birthdate: "January 8, 1947",
      birthplace: "Cebu City",
      deathDate: "March 2, 2026",
      printed: samplePrinted("DEATH"),
    },
  },
};
