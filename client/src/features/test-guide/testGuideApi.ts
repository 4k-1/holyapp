import { apiFetch } from "@/lib/api";

/** UAT only: the in-app test guide. The server answers 404 to all of this unless it runs with UAT_MODE=on. */

export type StepKey =
  | "signin"
  | "request"
  | "contact"
  | "records"
  | "pay"
  | "mass"
  | "give"
  | "certificate"
  | "office"
  | "logout";

export type StepStatus = "done" | "skipped" | null;
export type StepRating = "easy" | "okay" | "hard";

export interface GuideTester {
  n: number;
  email: string;
  parishSlug: string;
  contactNumber: string;
  sex: "Female" | "Male";
  first: string;
  last: string;
  born: string;
  birthplace: string;
  baptized: string;
  father: string;
  mother: string;
  massFor: string;
  donation: number;
}

export interface GuideState {
  tester: GuideTester;
  steps: {
    key: StepKey;
    status: StepStatus;
    rating: StepRating | null;
    hintUsed: boolean;
    /** Whether the guide has shown this task yet. */
    started: boolean;
    /** How long the task took, once done. */
    seconds: number | null;
  }[];
  request: {
    id: string;
    referenceNo: string;
    status: "pending" | "processing" | "released" | "rejected" | string;
    paid: boolean;
    released: boolean;
    rejectionReason: string | null;
    certificateHash: string | null;
  } | null;
  mass: { status: string; paid: boolean } | null;
  surveyUrl: string | null;
}

export interface TesterSignIn {
  n: number;
  email: string;
  password: string;
  parishSlug: string;
  parishName: string;
}

export function getGuideStatus() {
  return apiFetch<{ enabled: boolean }>("/test-guide/status", { auth: false });
}

export function getTesterSignIn(n: number) {
  return apiFetch<TesterSignIn>(`/test-guide/testers/${n}`, { auth: false });
}

export function getMyGuide() {
  return apiFetch<GuideState>("/test-guide/me");
}

export function saveStep(step: StepKey, body: { status?: StepStatus; rating?: StepRating; hint?: true; started?: true }) {
  return apiFetch<{ ok: true }>(`/test-guide/me/steps/${step}`, { method: "PUT", body });
}

/** What this browser remembers about the tester, so the guide still helps before sign-in and after log-out. */
export interface LocalTester {
  n: number;
  parishSlug: string;
  surveyUrl?: string | null;
  /** Set when the tester logged out at the last step. */
  loggedOut?: boolean;
  /** Tasks whose "Task complete" screen the tester has already seen. */
  acknowledged?: StepKey[];
  /** Pages visited for the "look at your records" step. */
  visited?: string[];
}

const KEY = "holyapp-test-guide";

export function readLocalTester(): LocalTester | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalTester) : null;
  } catch {
    return null;
  }
}

export function writeLocalTester(value: LocalTester | null) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // Private windows can refuse storage; the guide then only works while signed in.
  }
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

/** Fired whenever the remembered tester changes, so the guide panel can follow. */
export const LOCAL_EVENT = "holyapp-test-guide-updated";
