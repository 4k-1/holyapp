import type {
  BaptismCertificateData,
  CertificateData,
  CertificateType,
  ConfirmationCertificateData,
  DeathCertificateData,
  MarriageCertificateData,
} from "./certificateData";

/**
 * Dummy certificate data for previewing the templates. The parish header and signatory
 * are left out on purpose: the preview fills them from the tenant's parish settings.
 */
type Sample<T extends CertificateData> = Omit<T, "parish" | "signatory">;

export interface CertificateSample {
  id: string;
  label: string;
  data:
    | Sample<BaptismCertificateData>
    | Sample<ConfirmationCertificateData>
    | Sample<DeathCertificateData>
    | Sample<MarriageCertificateData>;
}

const baptismTypical: Sample<BaptismCertificateData> = {
  type: "BAPTISM",
  childName: "Maria Teresa Dela Cruz Santos",
  fatherName: "Roberto Manalo Santos",
  motherName: "Ana Marie Dela Cruz",
  placeOfBirth: "Cebu City",
  dateOfBirth: "1998-04-12",
  dateOfBaptism: "1998-04-26",
  minister: "Fr. Jose L. Ramirez",
  sponsors: ["Victor G. Lim", "Carmen R. Uy"],
  bookNo: "12",
  pageNo: "48",
  lineNo: "16",
  issuedOn: "2026-10-23",
  verification: {
    certificateId: "3f2b9c1e-6a4d-4e8b-9f0a-1c2d3e4f5a6b",
    controlNo: "BAP-2026-000123",
    hash: "9c4e1f0a7b3d58e26a1f4c9b0d7e3a5f1c8b2d6e4a0f9c3b7e1d5a2f8c6b4e0d",
  },
};

/** Long names and four sponsors: the worst case for fitting on one A5 page. */
const baptismLong: Sample<BaptismCertificateData> = {
  type: "BAPTISM",
  childName: "Maximiliano Francisco Bartolome Gregorio Dela Paz Villanueva-Montenegro Jr.",
  fatherName: "Juan Bautista Emmanuel Gregorio Villanueva-Montenegro Sr.",
  motherName: "Maria Concepcion Esperanza Lourdes Dela Paz-Villanueva",
  placeOfBirth: "Barangay San Isidro Labrador, Municipality of Talisay, Province of Cebu",
  dateOfBirth: "2001-11-22",
  dateOfBaptism: "2002-01-13",
  minister: "Msgr. Fr. Bartolome Ignacio Escarlata-Fernandez, SVD",
  sponsors: [
    "Victor Emmanuel G. Lim-Concepcion",
    "Carmencita Rosario Uy-Villareal",
    "Leonardo Bienvenido Q. Abellanosa III",
    "Maria Magdalena Felicidad T. Sarmiento",
  ],
  bookNo: "117",
  pageNo: "348",
  lineNo: "1206",
  remarks: [
    "Married to Angelica R. Torres at Sto. Niño Parish, 14 February 2027 (Bk 9, Pg 22, Ln 3)",
    "Confirmed 18 May 2014 (Bk 4, Pg 21, Ln 8)",
  ],
  issuedOn: "2026-11-07",
  verification: {
    certificateId: "a8d0e2c4-1b3f-4a5c-8e7d-9f0b1c2d3e4f",
    controlNo: "BAP-2026-004517",
    hash: "1f7a3c9e5b0d2846c1e9a7f3b5d0c2e48a6f1d3b9c7e5a0f2d4b6c8e1a3f5d7b",
  },
};

/** A preview copy: blanks everywhere the register has nothing, and no QR yet. */
const baptismSparse: Sample<BaptismCertificateData> = {
  type: "BAPTISM",
  childName: "Jose Andres Navarro",
  motherName: "Lucia P. Navarro",
  dateOfBaptism: "1987-06-07",
  minister: "Fr. Pedro Alonzo",
  sponsors: [],
  bookNo: "3",
  pageNo: "",
  lineNo: undefined,
  issuedOn: "2026-11-07",
};

const confirmation: Sample<ConfirmationCertificateData> = {
  type: "CONFIRMATION",
  personConfirmed: "Miguel Angel Reyes Torres",
  parishOfOrigin: "Sto. Rosario Parish, Mandaue City",
  address: "123 Mabini Street, Barangay Lahug, Cebu City",
  placeOfBaptism: "Sto. Rosario Parish, Mandaue City",
  fatherName: "Paolo Reyes Torres",
  motherName: "Lourdes Castillo Torres",
  sponsors: ["Ramon B. Aquino", "Teresita M. Gonzales", "Felipe S. Navarro"],
  minister: "Most Rev. Antonio D. Villanueva, D.D.",
  dateConfirmed: "2024-05-18",
  bookNo: "4",
  pageNo: "21",
  lineNo: "8",
  issuedOn: "2026-10-23",
  verification: {
    certificateId: "5c7e9a1b-3d5f-4b6a-8c0e-2f4a6b8c0d1e",
    controlNo: "CON-2026-000045",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
};

const death: Sample<DeathCertificateData> = {
  type: "DEATH",
  nameOfDeceased: "Rosario Elena Bautista Vda. de Mercado",
  sex: "female",
  ageYears: 79,
  fatherName: "Ernesto L. Bautista",
  motherName: "Felicidad R. Bautista",
  address: "45 P. del Rosario Street, Cebu City",
  dateOfDeath: "2026-03-02",
  dateOfBurial: "2026-03-07",
  placeOfBurial: "Carreta Cemetery, Cebu City",
  minister: "Fr. Jose L. Ramirez",
  bookNo: "3",
  pageNo: "9",
  lineNo: "2",
  issuedOn: "2026-10-23",
  verification: {
    certificateId: "7e9a1b3c-5d7f-4a8b-9c0d-1e2f3a4b5c6d",
    controlNo: "DTH-2026-000012",
    hash: "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
  },
};

const marriageTypical: Sample<MarriageCertificateData> = {
  type: "MARRIAGE",
  husband: {
    name: { first: "Juan Miguel", middle: "Reyes", last: "Cruz" },
    dateOfBirth: "1994-09-02",
    placeOfBirth: "Mandaue City, Cebu, Philippines",
    sex: "Male",
    citizenship: "Filipino",
    residence: "12 Mabini St., Brgy. Guizo, Mandaue City, Cebu, Philippines",
    religion: "Roman Catholic",
    civilStatus: "Single",
    father: { first: "Eduardo", middle: "Lim", last: "Cruz" },
    fatherCitizenship: "Filipino",
    mother: { first: "Lourdes", middle: "Tan", last: "Reyes" },
    motherCitizenship: "Filipino",
  },
  wife: {
    name: { first: "Maria Teresa", middle: "Dela Cruz", last: "Santos" },
    dateOfBirth: "1998-04-12",
    placeOfBirth: "Cebu City, Cebu, Philippines",
    sex: "Female",
    citizenship: "Filipino",
    residence: "45 P. del Rosario St., Brgy. Sambag I, Cebu City, Cebu, Philippines",
    religion: "Roman Catholic",
    civilStatus: "Single",
    father: { first: "Roberto", middle: "Manalo", last: "Santos" },
    fatherCitizenship: "Filipino",
    mother: { first: "Ana Marie", middle: "Uy", last: "Dela Cruz" },
    motherCitizenship: "Filipino",
  },
  placeOfMarriage: "Church of St. Joseph the Worker",
  marriageAddress: "Brgy. Mabolo, Cebu City, Cebu",
  dateOfMarriage: "2022-06-14",
  timeOfMarriage: "15:30",
  solemnizingOfficer: "Rev. Fr. Jose L. Ramirez",
  officerPosition: "Parish Priest",
  officerReligion: "Roman Catholic",
  marriageLicenseNo: "2022-0417",
  marriageLicenseIssuedOn: "2022-05-20",
  marriageLicenseIssuedAt: "Cebu City",
  witnesses: ["Victor G. Lim", "Carmen R. Uy"],
  bookNo: "7",
  pageNo: "11",
  lineNo: "3",
  issuedOn: "2026-10-23",
  verification: {
    certificateId: "3b1e6c2a-9f4d-4c8e-a1b2-7d6e5f4a3b2c",
    controlNo: "MAR-2026-000031",
    hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  },
};

/** A young wife (consent given), long names and six witnesses: two spill onto page 2. */
const marriageLong: Sample<MarriageCertificateData> = {
  ...marriageTypical,
  husband: {
    ...marriageTypical.husband,
    name: { first: "Francisco Emmanuel Jose", middle: "Villanueva-Alcantara", last: "De los Santos" },
    civilStatus: "Widowed",
  },
  wife: {
    ...marriageTypical.wife,
    name: { first: "Maria Concepcion Guadalupe", middle: "Fernandez-Buenaventura", last: "Dela Cruz" },
    dateOfBirth: "2005-01-30",
    consent: {
      name: { first: "Ana Marie", middle: "Uy", last: "Dela Cruz" },
      relationship: "Mother",
      residence: "45 P. del Rosario St., Brgy. Sambag I, Cebu City, Cebu, Philippines",
    },
  },
  witnesses: [
    "Victor G. Lim",
    "Carmen R. Uy",
    "Leonardo P. Villaflor",
    "Josefina M. Arcilla",
    "Ramon T. Escaño",
    "Teresita B. Gonzaga",
  ],
};

/** What a parish register often has: no license details, no time, no parents' citizenship. */
const marriageSparse: Sample<MarriageCertificateData> = {
  type: "MARRIAGE",
  husband: {
    name: { first: "Pedro", last: "Garcia" },
    dateOfBirth: "1990-02-11",
    father: { first: "Jose", last: "Garcia" },
    mother: { first: "Rosa", last: "Lopez" },
  },
  wife: {
    name: { first: "Elena", last: "Ramos" },
    father: {},
    mother: { first: "Lucia", last: "Ramos" },
  },
  placeOfMarriage: "Church of St. Joseph the Worker",
  dateOfMarriage: "2019-12-28",
  solemnizingOfficer: "Rev. Fr. Antonio Ma. Cuenco",
  witnesses: ["Mario Diaz"],
  bookNo: "5",
  pageNo: "40",
  lineNo: "12",
  issuedOn: "2026-10-23",
};

export const CERTIFICATE_SAMPLES: Record<CertificateType, CertificateSample[]> = {
  BAPTISM: [
    { id: "typical", label: "Typical", data: baptismTypical },
    { id: "long", label: "Long names, 4 sponsors", data: baptismLong },
    { id: "sparse", label: "Missing fields", data: baptismSparse },
  ],
  CONFIRMATION: [{ id: "typical", label: "Typical", data: confirmation }],
  DEATH: [{ id: "typical", label: "Typical", data: death }],
  MARRIAGE: [
    { id: "typical", label: "Typical", data: marriageTypical },
    { id: "long", label: "Long names, consent, 6 witnesses", data: marriageLong },
    { id: "sparse", label: "Missing fields", data: marriageSparse },
  ],
};
