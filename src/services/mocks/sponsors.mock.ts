import type { SacramentSponsorAssignment, Sponsor } from "@/features/parish-admin/records/types";

// Sponsors are people, not baptism-specific records — the same ninong/ninang
// can appear across multiple sacraments, so they live in their own table and
// get linked in via MOCK_SPONSOR_ASSIGNMENTS (sacramentType + sacramentRecordId).
export const MOCK_SPONSORS: Sponsor[] = [
  { id: "spn-01", firstName: "Juanita", lastName: "Alfonso", sex: "Female" },
  { id: "spn-02", firstName: "Emilio", lastName: "Javier", sex: "Male" },
  { id: "spn-03", firstName: "Antonio", lastName: "Villareal", sex: "Male" },
  { id: "spn-04", firstName: "Beatriz", lastName: "Villareal", sex: "Female" },
  { id: "spn-05", firstName: "Josefina", lastName: "Lim", sex: "Female" },
  { id: "spn-06", firstName: "Ramon", lastName: "Lim", sex: "Male" },
  { id: "spn-07", firstName: "Carmen", lastName: "Diaz", sex: "Female" },
  { id: "spn-08", firstName: "Rafael", lastName: "Diaz", sex: "Male" },
  { id: "spn-09", firstName: "Teresa", lastName: "Ong", sex: "Female" },
  { id: "spn-10", firstName: "Vicente", lastName: "Ong", sex: "Male" },
  { id: "spn-11", firstName: "Lourdes", lastName: "Ang", sex: "Female" },
  { id: "spn-12", firstName: "Simon", lastName: "Ang", sex: "Male" },
];

export const MOCK_SPONSOR_ASSIGNMENTS: SacramentSponsorAssignment[] = [
  { id: "ssa-01", sponsorId: "spn-01", sacramentType: "baptism", sacramentRecordId: "bap-001", role: "Ninang", isPrimary: true, isSigned: true },
  { id: "ssa-02", sponsorId: "spn-02", sacramentType: "baptism", sacramentRecordId: "bap-001", role: "Ninong", isPrimary: false, isSigned: true },

  { id: "ssa-03", sponsorId: "spn-03", sacramentType: "baptism", sacramentRecordId: "bap-002", role: "Ninong", isPrimary: true, isSigned: true },
  { id: "ssa-04", sponsorId: "spn-04", sacramentType: "baptism", sacramentRecordId: "bap-002", role: "Ninang", isPrimary: false, isSigned: true },

  { id: "ssa-05", sponsorId: "spn-05", sacramentType: "baptism", sacramentRecordId: "bap-003", role: "Ninang", isPrimary: true, isSigned: true },
  { id: "ssa-06", sponsorId: "spn-06", sacramentType: "baptism", sacramentRecordId: "bap-003", role: "Ninong", isPrimary: false, isSigned: true },

  { id: "ssa-07", sponsorId: "spn-07", sacramentType: "baptism", sacramentRecordId: "bap-004", role: "Ninang", isPrimary: true, isSigned: true },
  { id: "ssa-08", sponsorId: "spn-08", sacramentType: "baptism", sacramentRecordId: "bap-004", role: "Ninong", isPrimary: false, isSigned: true },

  { id: "ssa-09", sponsorId: "spn-09", sacramentType: "baptism", sacramentRecordId: "bap-005", role: "Ninang", isPrimary: true, isSigned: true },
  { id: "ssa-10", sponsorId: "spn-10", sacramentType: "baptism", sacramentRecordId: "bap-005", role: "Ninong", isPrimary: false, isSigned: true },

  { id: "ssa-11", sponsorId: "spn-11", sacramentType: "baptism", sacramentRecordId: "bap-006", role: "Ninang", isPrimary: true, isSigned: true },
  { id: "ssa-12", sponsorId: "spn-12", sacramentType: "baptism", sacramentRecordId: "bap-006", role: "Ninong", isPrimary: false, isSigned: true },
];
