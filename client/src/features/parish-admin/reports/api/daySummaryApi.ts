import { apiFetch, ApiError } from "@/lib/api";

/* A4: one day's copies, receipts and money, worked out from the records each time. Nothing is saved. */

export type MoneyMethod = "cash" | "gcash" | "other";
export type ReceiptKind = "certificate" | "intention" | "donation";

export interface DayCopy {
  id: string;
  code: string;
  holderName: string | null;
  sacramentType: string;
  recordPath: string;
  issuedAt: string;
  issuedBy: string;
  channel: "walkin" | "pickup" | "digital";
  status: "valid" | "superseded" | "invalid" | "spoiled";
  printConfirmed: boolean;
  receiptNumber: string | null;
  paid: boolean;
  paymentMethod: string | null;
  amount: number | null;
}

export interface DayReprint {
  id: string;
  code: string;
  holderName: string | null;
  reason: string;
  note: string | null;
  at: string;
  by: string;
}

export interface DaySpoiled {
  id: string;
  code: string;
  holderName: string | null;
  reason: string | null;
  at: string;
  by: string;
}

export interface DayReceipt {
  id: string;
  at: string;
  kind: ReceiptKind;
  receipt: string | null;
  certificateCode: string | null;
  name: string | null;
  method: MoneyMethod;
  amount: number;
  by: string;
}

export interface DayMoneyLine {
  kind: ReceiptKind;
  count: number;
  cash: number;
  gcash: number;
  other: number;
  total: number;
}

export interface DaySummary {
  date: string;
  staffId: string | null;
  staff: { id: string; name: string; role: string }[];
  certificates: {
    issued: number;
    reprinted: number;
    spoiled: number;
    copies: DayCopy[];
    reprints: DayReprint[];
    spoiledCopies: DaySpoiled[];
  };
  money: { cash: number; gcash: number; other: number; total: number; byKind: DayMoneyLine[] };
  receipts: DayReceipt[];
  warnings: { kind: "unpaid" | "unconfirmed"; certificateId: string; message: string }[];
}

export async function getDaySummary(date?: string, staffId?: string): Promise<DaySummary> {
  const query = new URLSearchParams();
  if (date) query.set("date", date);
  if (staffId) query.set("staffId", staffId);
  const search = query.toString();
  try {
    return await apiFetch<DaySummary>(`/reports/day${search ? `?${search}` : ""}`);
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server.", { cause: err });
  }
}
