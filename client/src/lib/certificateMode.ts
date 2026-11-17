import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Whether certificates on this site are test copies (HolyApp is being tested).
 * null while it's still being asked, so a certificate isn't printed before its
 * test mark can be drawn.
 */
let cached: Promise<boolean> | null = null;
let known: boolean | null = null;

/** Asked once per page load. If the server can't be reached, assume test mode: a wrong "test" mark is safer than a test copy passing as real. */
export function loadCertificateTestMode(): Promise<boolean> {
  cached ??= apiFetch<{ testMode: boolean }>("/certificates/mode")
    .then((mode) => mode.testMode !== false)
    .catch(() => {
      cached = null;
      return true;
    })
    .then((testMode) => {
      known = testMode;
      return testMode;
    });
  return cached;
}

export function useCertificateTestMode(): boolean | null {
  const [testMode, setTestMode] = useState<boolean | null>(known);
  useEffect(() => {
    let active = true;
    loadCertificateTestMode().then((value) => {
      if (active) setTestMode(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return testMode;
}
