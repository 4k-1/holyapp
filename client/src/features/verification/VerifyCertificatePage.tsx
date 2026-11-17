import { TestCertificateNotice } from "@/components/TestCertificateNotice";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import type { SacramentType } from "@/types";
import mtcarmellogo from "@/assets/mtcarmellogo.png";
import "./verify.css";

interface VerificationFields {
  requestId: string;
  registerRef: string;
  birthdate?: string;
  birthplace?: string;
  baptismDate?: string;
  confirmationDate?: string;
  marriageDate?: string;
  deathDate?: string;
  motherName?: string;
  fatherName?: string;
  certCode?: string;
  verifyUrl?: string;
}

interface Verification {
  status: "valid" | "superseded" | "invalid";
  /** For a void copy: withdrawn later ("revoked") or spoiled when printed. */
  voidKind?: "revoked" | "spoiled";
  code: string;
  holderName: string;
  sacramentType: SacramentType;
  issuedAt: string;
  parishName: string;
  parishAddress?: string;
  parishSlug?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  footerText?: string;
  reason?: string;
  /** What the copy was issued for (B2). */
  purpose?: string;
  /** Marriage copies: the last day it is accepted. */
  validUntil?: string;
  /** Past `validUntil`: no longer accepted for marriage, though the record stands. */
  expiredForMarriage?: boolean;
  fields?: VerificationFields;
}

const UNAVAILABLE = "This certificate could not be checked. Try again in a moment.";

/** What the check found: one of the register's states, no match at all, or no answer from the server. */
type Outcome = Verification["status"] | "notfound" | "unavailable";
type Tone = "teal" | "gold" | "red";

const TONES: Record<Tone, { band: string; title: string; icon: string; ring: string; mark: string; notice: string }> = {
  teal: {
    band: "bg-[#e2f1f0]",
    title: "text-[#0e3b46]",
    icon: "from-[#1f8fa1] to-[#0e3b46]",
    ring: "border-[#16798c]/35",
    mark: "text-[#16798c]/45",
    notice: "bg-[#e2f1f0] text-[#0e3b46]",
  },
  gold: {
    band: "bg-[#f8edd3]",
    title: "text-[#7c5410]",
    icon: "from-[#d9a632] to-[#8a5a12]",
    ring: "border-[#a87a12]/35",
    mark: "text-[#a87a12]/45",
    notice: "bg-[#f8edd3] text-[#5c3f0c]",
  },
  red: {
    band: "bg-[#f5e2df]",
    title: "text-[#8f2f27]",
    icon: "from-[#b9493e] to-[#7a2620]",
    ring: "border-[#8f2f27]/30",
    mark: "text-[#8f2f27]/40",
    notice: "bg-[#f5e2df] text-[#6e231d]",
  },
};

const OUTCOMES: Record<Outcome, { tone: Tone; icon: "check" | "alert" | "cross"; title: string; detail: string }> = {
  valid: {
    tone: "teal",
    icon: "check",
    title: "Valid certificate",
    detail: "This certificate matches the parish register exactly as issued and has not been altered.",
  },
  superseded: {
    tone: "gold",
    icon: "alert",
    title: "Superseded certificate",
    detail: "This certificate was valid when issued, but the parish has since issued a newer one for this record.",
  },
  invalid: {
    tone: "red",
    icon: "cross",
    title: "Revoked certificate",
    detail: "The parish office has withdrawn this certificate. It should no longer be accepted.",
  },
  notfound: {
    tone: "red",
    icon: "cross",
    title: "Certificate could not be verified",
    detail: "This code does not match any certificate issued through HolyApp.",
  },
  unavailable: {
    tone: "gold",
    icon: "alert",
    title: "Verification is unavailable right now",
    detail: "The verification service didn't respond. The certificate may still be valid.",
  },
};

/** A copy that printed wrongly and was voided at the office before it was handed over. */
const SPOILED = {
  tone: "red" as const,
  icon: "cross" as const,
  title: "Void certificate",
  detail: "This copy was spoiled when it was printed and the parish office voided it. It is not a valid certificate.",
};

/** Parish seals kept in the app until the API serves uploaded ones. */
const SEALS: Record<string, string> = {
  mtcarmel: mtcarmellogo,
};

const TYPE_LABEL: Record<SacramentType, string> = {
  baptism: "Baptism",
  confirmation: "Confirmation",
  marriage: "Marriage",
  death: "Death",
};

const STATUS_LABEL: Record<Verification["status"], string> = {
  valid: "Current",
  superseded: "Superseded by a newer certificate",
  invalid: "Revoked",
};

const VERIFY_STATES = new Set<Verification["status"]>(["valid", "superseded", "invalid"]);

function isVerification(payload: Partial<Verification>): payload is Verification {
  return Boolean(
    payload.status &&
      VERIFY_STATES.has(payload.status) &&
      payload.holderName &&
      payload.code
  );
}

function apiBases() {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  // A built site knows exactly where its API is; the guesses below are for phones on the dev Wi-Fi.
  if (import.meta.env.PROD) return [configured];
  const host = window.location.hostname;
  const bases = [""];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    bases.push(`http://${host}:5000`);
  }
  if (configured && !bases.includes(configured)) bases.push(configured);
  return bases;
}

async function loadVerification(hash: string): Promise<Verification> {
  const path = `/certificates/verify/${encodeURIComponent(hash)}`;
  let unavailable = false;

  for (const base of apiBases()) {
    try {
      const response = await fetch(`${base}${path}`);
      const text = await response.text();
      if (!text.trim().startsWith("{")) {
        unavailable = true;
        continue;
      }
      const payload = JSON.parse(text) as { error?: string } & Partial<Verification>;
      if (response.status === 404) {
        throw new Error("Certificate not found.");
      }
      if (!response.ok || !isVerification(payload)) {
        unavailable = true;
        continue;
      }
      return payload;
    } catch (err) {
      if (err instanceof Error && err.message === "Certificate not found.") throw err;
      unavailable = true;
    }
  }

  if (unavailable) {
    throw new Error(UNAVAILABLE);
  }
  throw new Error("Certificate not found.");
}

/** "2026-06-27" → "June 27, 2026", read as a calendar date so no time zone moves it a day. */
function formatIssued(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value || "—";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** The public page a certificate's QR code opens: whether the parish register still stands behind it. */
export function VerifyCertificatePage() {
  const { hash = "" } = useParams();
  const { data, loading, error } = useAsync(() => loadVerification(hash), [hash]);
  const [checkedAt] = useState(() => new Date());

  const outcome: Outcome | null = loading
    ? null
    : data
      ? data.status
      : error instanceof Error && error.message === UNAVAILABLE
        ? "unavailable"
        : "notfound";

  return (
    <div className="verify-page min-h-screen bg-[#f4f6f7] px-4 py-8 sm:py-12 print:bg-white print:p-0">
      <main className="mx-auto w-full max-w-[640px]">
        <TestCertificateNotice className="mb-4 print:mb-3" />
        <article className="overflow-hidden rounded-md border border-[#d3dde0] bg-white shadow-[0_1px_3px_rgb(19_38_43/0.06)] print:rounded-none print:border-[#999] print:shadow-none">
          <IssuerHeader data={data ?? null} />
          {outcome === null ? (
            <div role="status" className="flex items-center gap-3 px-6 py-12 sm:px-8">
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-[#0e4a57]/20 border-t-[#0e4a57] motion-reduce:animate-none"
                aria-hidden="true"
              />
              <p className="text-[0.9375rem] text-[#4a5d63]">Checking this certificate against the parish register…</p>
            </div>
          ) : (
            <Result outcome={outcome} data={data ?? null} hash={hash} checkedAt={checkedAt} />
          )}
        </article>

        <p className="mt-5 text-[0.8125rem] leading-relaxed text-[#4a5d63] sm:px-1">
          This page confirms the record held by the issuing parish at the time of checking. It does not replace the signed
          certificate. Anyone can use this page; no account or sign-in is needed.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 text-[0.8125rem] text-[#4a5d63] no-underline hover:text-[#13262b] sm:px-1 print:hidden"
        >
          <img src="/holyapp-logo.webp" alt="" className="h-6 w-6 rounded-full border border-[#e3e9eb] bg-white object-contain p-[3px]" />
          Verification service by <span className="font-semibold text-[#13262b]">HolyApp</span>
        </Link>
      </main>
    </div>
  );
}

/** Who stands behind the certificate: the issuing parish, or HolyApp when no parish could be found. */
function IssuerHeader({ data }: { data: Verification | null }) {
  const seal = data?.parishSlug ? SEALS[data.parishSlug] : undefined;
  return (
    <header className="flex items-center gap-4 border-b border-[#e3e9eb] px-6 py-5 sm:px-8">
      {data ? (
        seal ? (
          <img src={seal} alt="" className="h-12 w-12 shrink-0 rounded-full border border-[#e3e9eb] object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#e3e9eb] text-lg text-[#0e4a57]">
            ✝
          </span>
        )
      ) : (
        <img src="/holyapp-logo.webp" alt="" className="h-12 w-12 shrink-0 rounded-full border border-[#e3e9eb] bg-white object-contain p-1.5" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#4a5d63]">Certificate verification</p>
        <p className="mt-0.5 text-[1rem] font-semibold leading-snug text-[#13262b]">{data ? data.parishName : "HolyApp"}</p>
        {data?.parishAddress && <p className="text-[0.8125rem] text-[#4a5d63]">{data.parishAddress}</p>}
      </div>
    </header>
  );
}

function Result({
  outcome,
  data,
  hash,
  checkedAt,
}: {
  outcome: Outcome;
  data: Verification | null;
  hash: string;
  checkedAt: Date;
}) {
  const spoiled = outcome === "invalid" && data?.voidKind === "spoiled";
  const copy = spoiled ? SPOILED : OUTCOMES[outcome];
  const tone = TONES[copy.tone];
  const checked = checkedAt.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <div className={`flex items-start gap-4 px-6 py-5 sm:px-8 ${tone.band}`}>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-[0_6px_14px_-8px_rgb(0_0_0/0.55)] ${tone.icon}`}
        >
          <StatusIcon kind={copy.icon} />
        </span>
        <div className="min-w-0">
          <h1 className={`font-sans text-[1.25rem] font-bold leading-snug sm:text-[1.375rem] ${tone.title}`}>{copy.title}</h1>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-[#4a5d63]">{copy.detail}</p>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8">
        {data ? (
          <>
            <dl className="divide-y divide-[#e3e9eb] border-y border-[#e3e9eb]">
              <Row label="Certificate holder">
                <span className="text-[1.0625rem] font-semibold">{data.holderName}</span>
              </Row>
              <Row label="Certificate type">{TYPE_LABEL[data.sacramentType] ?? data.sacramentType}</Row>
              <Row label="Issuing parish">{data.parishName}</Row>
              <Row label="Date issued">{formatIssued(data.issuedAt)}</Row>
              <Row label="Reference number">
                <span className="font-mono text-[0.875rem]">{data.code}</span>
              </Row>
              {data.purpose && <Row label="Issued for">{data.purpose}</Row>}
              {data.validUntil && (
                <Row label="Valid for marriage until">
                  {formatIssued(data.validUntil)}
                  {data.expiredForMarriage && <span className="ml-1.5 font-semibold text-[#8f2f27]">(expired)</span>}
                </Row>
              )}
              <Row label="Register status">{spoiled ? "Void (spoiled when printed)" : STATUS_LABEL[data.status]}</Row>
            </dl>
            {data.status === "valid" && data.expiredForMarriage && (
              <Notice className={TONES.gold.notice}>
                <span className="font-semibold">Expired for marriage use.</span> This copy was issued for marriage and is
                accepted for 6 months. The record is still valid; ask {data.parishName} for a new copy.
              </Notice>
            )}
            {data.status === "superseded" && (
              <Notice className={tone.notice}>
                A newer certificate has been issued for this record. Please ask {data.parishName} for the current copy.
              </Notice>
            )}
            {data.status === "invalid" && (
              <Notice className={tone.notice}>
                {data.reason ? (
                  <>
                    <span className="font-semibold">Reason given by the parish:</span> {data.reason}
                  </>
                ) : (
                  <>Contact {data.parishName} for details.</>
                )}
              </Notice>
            )}
          </>
        ) : outcome === "unavailable" ? (
          <Notice className={tone.notice}>
            Check your connection and try again. If it keeps happening, contact the parish that issued the certificate.
          </Notice>
        ) : (
          <>
            <Notice className={tone.notice}>
              Contact the parish that issued this certificate to confirm it is authentic. A mistyped or damaged code can
              cause this result, so it is not necessarily a sign of tampering.
            </Notice>
            <dl className="mt-5 border-y border-[#e3e9eb]">
              <Row label="Code checked">
                <span className="break-all font-mono text-[0.875rem]">{hash || "—"}</span>
              </Row>
            </dl>
          </>
        )}

        <p className="mt-5 flex items-start gap-2 text-[0.875rem] leading-relaxed text-[#4a5d63]">
          <ClockIcon />
          <span>
            {outcome === "unavailable" ? "Attempted on " : data ? "Checked against the parish register on " : "Checked on "}
            <span className="font-semibold text-[#13262b]">{checked}</span>.
          </span>
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row print:hidden">
          {outcome === "unavailable" ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[#0e4a57] px-5 text-[0.9375rem] font-semibold text-white hover:bg-[#0b3b45] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0e4a57]/30"
            >
              Try again
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#c7d3d6] bg-white px-5 text-[0.9375rem] font-semibold text-[#13262b] hover:bg-[#f4f6f7] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0e4a57]/25"
            >
              <PrintIcon />
              Print this result
            </button>
          )}
        </div>
      </div>

      {data && (
        <details className="border-t border-[#e3e9eb] print:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-6 py-4 text-[0.875rem] font-semibold text-[#13262b] hover:bg-[#f7f9f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0e4a57]/30 sm:px-8">
            Technical details
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="verify-chevron h-4 w-4 shrink-0 text-[#4a5d63] transition-transform" aria-hidden="true">
              <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <dl className="space-y-2.5 px-6 pb-6 text-[0.8125rem] sm:px-8">
            <TechRow label="Verification code">
              <span className="break-all font-mono">{hash || "—"}</span>
            </TechRow>
            {data.fields?.registerRef && data.fields.registerRef !== "—" && (
              <TechRow label="Register entry">{data.fields.registerRef}</TechRow>
            )}
            <TechRow label="Checked against">The parish register kept on HolyApp</TechRow>
          </dl>
        </details>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-3.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[0.8125rem] text-[#4a5d63]">{label}</dt>
      <dd className="min-w-0 text-[0.9375rem] leading-snug text-[#13262b]">{children}</dd>
    </div>
  );
}

function TechRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3">
      <dt className="text-[#4a5d63]">{label}</dt>
      <dd className="text-[#13262b]">{children}</dd>
    </div>
  );
}

function Notice({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`mt-6 flex gap-3 rounded-lg px-4 py-3.5 text-[0.875rem] leading-relaxed ${className}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 6.5v4M10 13.5h.01" strokeLinecap="round" />
      </svg>
      <p>{children}</p>
    </div>
  );
}

function StatusIcon({ kind }: { kind: "check" | "alert" | "cross" }) {
  if (kind === "check") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-6 w-6" aria-hidden="true">
        <path d="m5.5 12.5 4.5 4.5 8.5-9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "cross") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-6 w-6" aria-hidden="true">
        <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.5h.01" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-[3px] h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 6v4l2.5 1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
      <path d="M5.5 8V3h9v5M5.5 14.5h-2v-6.5h13v6.5h-2" strokeLinejoin="round" />
      <path d="M5.5 11.5h9V17h-9z" strokeLinejoin="round" />
    </svg>
  );
}
