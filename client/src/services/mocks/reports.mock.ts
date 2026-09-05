export interface SacramentYearRow {
  year: number;
  baptism: number;
  confirmation: number;
  marriage: number;
  death: number;
}

export interface CertificateMonthRow {
  month: string;
  pending: number;
  processing: number;
  released: number;
  rejected: number;
  baptism: number;
  confirmation: number;
  marriage: number;
  death: number;
  online: number;
  walkin: number;
}

export interface DonationMonthRow {
  month: string;
  amount: number;
  cash: number;
  gcash: number;
  roof: number;
  sound: number;
  offertory: number;
  outreach: number;
}

export interface IntentionMonthRow {
  month: string;
  pending: number;
  confirmed: number;
  said: number;
  offering: number;
}

/** Yearly register totals for the prototype parish. Confirmation years run in clusters. */
export const SACRAMENT_YEARLY: SacramentYearRow[] = [
  { year: 2018, baptism: 54, confirmation: 0, marriage: 21, death: 12 },
  { year: 2019, baptism: 49, confirmation: 61, marriage: 19, death: 14 },
  { year: 2020, baptism: 28, confirmation: 0, marriage: 8, death: 18 },
  { year: 2021, baptism: 33, confirmation: 0, marriage: 11, death: 16 },
  { year: 2022, baptism: 47, confirmation: 58, marriage: 24, death: 13 },
  { year: 2023, baptism: 52, confirmation: 0, marriage: 22, death: 12 },
  { year: 2024, baptism: 56, confirmation: 64, marriage: 26, death: 15 },
  { year: 2025, baptism: 51, confirmation: 0, marriage: 23, death: 14 },
  { year: 2026, baptism: 31, confirmation: 42, marriage: 14, death: 8 },
];

export const CERTIFICATE_MONTHLY: CertificateMonthRow[] = [
  { month: "2025-07", pending: 2, processing: 3, released: 8, rejected: 0, baptism: 8, confirmation: 2, marriage: 2, death: 1, online: 9, walkin: 4 },
  { month: "2025-08", pending: 1, processing: 4, released: 11, rejected: 1, baptism: 10, confirmation: 3, marriage: 3, death: 1, online: 11, walkin: 6 },
  { month: "2025-09", pending: 3, processing: 2, released: 9, rejected: 0, baptism: 7, confirmation: 4, marriage: 2, death: 1, online: 8, walkin: 6 },
  { month: "2025-10", pending: 2, processing: 5, released: 12, rejected: 0, baptism: 11, confirmation: 3, marriage: 4, death: 1, online: 13, walkin: 6 },
  { month: "2025-11", pending: 4, processing: 3, released: 7, rejected: 1, baptism: 6, confirmation: 5, marriage: 3, death: 1, online: 10, walkin: 5 },
  { month: "2025-12", pending: 1, processing: 2, released: 14, rejected: 0, baptism: 9, confirmation: 4, marriage: 3, death: 1, online: 12, walkin: 5 },
  { month: "2026-01", pending: 3, processing: 4, released: 8, rejected: 0, baptism: 8, confirmation: 3, marriage: 3, death: 1, online: 10, walkin: 5 },
  { month: "2026-02", pending: 2, processing: 3, released: 10, rejected: 1, baptism: 9, confirmation: 2, marriage: 4, death: 1, online: 11, walkin: 5 },
  { month: "2026-03", pending: 1, processing: 5, released: 11, rejected: 0, baptism: 10, confirmation: 4, marriage: 2, death: 1, online: 12, walkin: 5 },
  { month: "2026-04", pending: 4, processing: 3, released: 9, rejected: 0, baptism: 8, confirmation: 3, marriage: 4, death: 1, online: 9, walkin: 7 },
  { month: "2026-05", pending: 2, processing: 4, released: 13, rejected: 1, baptism: 11, confirmation: 5, marriage: 3, death: 1, online: 14, walkin: 6 },
  { month: "2026-06", pending: 3, processing: 6, released: 7, rejected: 0, baptism: 9, confirmation: 3, marriage: 3, death: 1, online: 11, walkin: 5 },
];

export const DONATION_MONTHLY: DonationMonthRow[] = [
  { month: "2025-07", amount: 18400, cash: 12100, gcash: 6300, roof: 8000, sound: 2400, offertory: 5600, outreach: 2400 },
  { month: "2025-08", amount: 22100, cash: 14000, gcash: 8100, roof: 9500, sound: 3100, offertory: 6200, outreach: 3300 },
  { month: "2025-09", amount: 19850, cash: 11200, gcash: 8650, roof: 7200, sound: 2800, offertory: 6850, outreach: 3000 },
  { month: "2025-10", amount: 25600, cash: 16800, gcash: 8800, roof: 12000, sound: 3600, offertory: 6400, outreach: 3600 },
  { month: "2025-11", amount: 17300, cash: 10100, gcash: 7200, roof: 5400, sound: 2100, offertory: 7100, outreach: 2700 },
  { month: "2025-12", amount: 31200, cash: 19800, gcash: 11400, roof: 14000, sound: 4200, offertory: 8900, outreach: 4100 },
  { month: "2026-01", amount: 16400, cash: 9800, gcash: 6600, roof: 4800, sound: 1900, offertory: 6700, outreach: 3000 },
  { month: "2026-02", amount: 18900, cash: 11100, gcash: 7800, roof: 6200, sound: 2500, offertory: 7100, outreach: 3100 },
  { month: "2026-03", amount: 20750, cash: 12400, gcash: 8350, roof: 7800, sound: 2700, offertory: 6850, outreach: 3400 },
  { month: "2026-04", amount: 17600, cash: 10200, gcash: 7400, roof: 5100, sound: 2200, offertory: 7300, outreach: 3000 },
  { month: "2026-05", amount: 24100, cash: 15100, gcash: 9000, roof: 11000, sound: 3400, offertory: 6200, outreach: 3500 },
  { month: "2026-06", amount: 32800, cash: 19300, gcash: 13500, roof: 16000, sound: 4000, offertory: 7800, outreach: 5000 },
];

export const INTENTION_MONTHLY: IntentionMonthRow[] = [
  { month: "2026-01", pending: 4, confirmed: 18, said: 42, offering: 18600 },
  { month: "2026-02", pending: 3, confirmed: 16, said: 38, offering: 16400 },
  { month: "2026-03", pending: 5, confirmed: 21, said: 44, offering: 19200 },
  { month: "2026-04", pending: 2, confirmed: 19, said: 40, offering: 17100 },
  { month: "2026-05", pending: 6, confirmed: 24, said: 48, offering: 21400 },
  { month: "2026-06", pending: 4, confirmed: 22, said: 51, offering: 22800 },
  { month: "2026-07", pending: 3, confirmed: 20, said: 46, offering: 20100 },
  { month: "2026-08", pending: 5, confirmed: 28, said: 54, offering: 24600 },
  { month: "2026-09", pending: 8, confirmed: 19, said: 12, offering: 9800 },
];
