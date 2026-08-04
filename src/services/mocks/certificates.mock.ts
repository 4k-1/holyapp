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
  },
];