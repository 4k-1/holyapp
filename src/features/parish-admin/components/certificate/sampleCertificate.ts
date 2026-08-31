import type { CertificateFields } from "@/features/parish-admin/components/CertificateDocument";
import type { SacramentType } from "@/types";

export const SAMPLE_CERTIFICATE: Record<
  SacramentType,
  { name: string; fields: Omit<CertificateFields, "certCode"> }
> = {
  baptism: {
    name: "Maria Teresa Santos",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 12, Page 48, Entry 16",
      birthdate: "April 12, 1998",
      birthplace: "Cebu City",
      baptismDate: "April 26, 1998",
      motherName: "Ana Marie Santos",
      fatherName: "Roberto Santos",
    },
  },
  confirmation: {
    name: "Miguel Angel Torres",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 4, Page 21, Entry 8",
      birthdate: "August 3, 2009",
      birthplace: "Cebu City",
      confirmationDate: "May 18, 2024",
      motherName: "Lourdes Torres",
      fatherName: "Paolo Torres",
    },
  },
  marriage: {
    name: "Maria Teresa Santos and Juan Miguel Cruz",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 7, Page 11, Entry 3",
      marriageDate: "June 14, 2022",
    },
  },
  death: {
    name: "Rosario Elena Bautista",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 3, Page 9, Entry 2",
      birthdate: "January 8, 1947",
      birthplace: "Cebu City",
      deathDate: "March 2, 2026",
    },
  },
};
