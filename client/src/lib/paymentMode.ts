import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface PaymentMode {
  gcash: boolean;
  /** GCash runs on PayMongo's test keys: payments are pretend and no real money moves. */
  testMode: boolean;
}

let cached: Promise<PaymentMode> | null = null;

/** Asked once per page load; if the server can't be reached, nothing is claimed either way. */
export function loadPaymentMode(): Promise<PaymentMode> {
  cached ??= apiFetch<PaymentMode>("/payments/mode").catch(() => {
    cached = null;
    return { gcash: false, testMode: false };
  });
  return cached;
}

/** True when GCash payments on this site are only tests. */
export function usePaymentTestMode(): boolean {
  const [testMode, setTestMode] = useState(false);
  useEffect(() => {
    let active = true;
    loadPaymentMode().then((mode) => {
      if (active) setTestMode(mode.testMode);
    });
    return () => {
      active = false;
    };
  }, []);
  return testMode;
}
