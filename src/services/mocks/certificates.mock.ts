import type { IssuedCertificate } from "@/types";

export const MOCK_CERTIFICATES: IssuedCertificate[] = [
  {
    id: "cert-1",
    requestId: "req-5",
    parishId: "parish-1",
    ownerId: "u-parishioner",
    sacramentType: "baptism",
    holderName: "Maria Clara Santos",
    issuedAt: "2026-06-27",
    state: "valid",
    certCode: "CF-BAP-6270-01",
    fields: {
      requestId: "req-5",
      registerRef: "Book 12, Page 34, Entry 7",
      birthdate: "March 3, 1998",
      birthplace: "Cebu City, Cebu",
      baptismDate: "April 12, 1998",
      motherName: "Elena Reyes Santos",
      fatherName: "Ramon Cruz Santos",
    },
  },
  {
    id: "cert-2",
    requestId: "req-x",
    parishId: "parish-1",
    ownerId: "u-parishioner",
    sacramentType: "marriage",
    holderName: "Maria Clara Santos",
    issuedAt: "2026-06-21",
    state: "valid",
    certCode: "CF-MAR-6210-01",
    fields: {
      requestId: "req-x",
      registerRef: "Book 4, Page 18, Entry 3",
      marriageDate: "June 21, 2026",
    },
  },
];