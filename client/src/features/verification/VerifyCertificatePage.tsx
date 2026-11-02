import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { CertificateDocument } from "@/features/parish-admin/components/CertificateDocument";
import { CERT_SHEET_WIDTH } from "@/features/parish-admin/components/certificate/constants";
import { useAsync } from "@/hooks/useAsync";
import type { Parish, SacramentType } from "@/types";
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
  fields?: VerificationFields;
}

const SEALS: Record<string, string> = {
  mtcarmel: mtcarmellogo,
};

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
    title: "Valid Certificate",
    detail: "This certificate matches the parish register exactly as issued and has not been altered.",
  },
  superseded: {
    tone: "gold",
    icon: "alert",
    title: "Superseded Certificate",
    detail: "This certificate was valid when issued, but the parish has since issued a newer one for this record.",
  },
  invalid: {
    tone: "red",
    icon: "cross",
    title: "Revoked Certificate",
    detail: "The parish office has withdrawn this certificate. It should no longer be accepted.",
  },
  notfound: {
    tone: "red",
    icon: "cross",
    title: "Could Not Be Verified",
    detail: "This code does not match any certificate issued through HolyApp.",
  },
  unavailable: {
    tone: "gold",
    icon: "alert",
    title: "Could Not Check Right Now",
    detail: "The verification service didn't respond. The certificate may still be valid.",
  },
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

function parishFrom(data: Verification): Parish {
  return {
    id: data.parishSlug || "parish",
    slug: data.parishSlug || "",
    name: data.parishName,
    address: data.parishAddress || "",
    contact: "",
    email: "",
    sealUrl: data.parishSlug ? SEALS[data.parishSlug] : undefined,
    createdAt: "",
    updatedAt: "",
  };
}

/** "2026-06-27" → "June 27, 2026", read as a calendar date so no time zone moves it a day. */
function formatIssued(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value || "—";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** A long code shortened for the eye; the full one is in the technical details. */
function shortCode(code: string) {
  return code.length > 16 ? `${code.slice(0, 8)}…${code.slice(-4)}` : code;
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
    <div className="verify-page min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[480px]">
        {outcome === null ? (
          <div
            role="status"
            className="flex flex-col items-center rounded-[24px] bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgb(14_59_70/0.06),0_24px_48px_-28px_rgb(14_59_70/0.45)] ring-1 ring-[#dfe7e9]"
          >
            <span
              className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#16798c]/20 border-t-[#16798c] motion-reduce:animate-none"
              aria-hidden="true"
            />
            <p className="mt-4 text-[0.9375rem] text-[#5b7079]">Checking this certificate…</p>
          </div>
        ) : (
          <ResultCard outcome={outcome} data={data ?? null} hash={hash} checkedAt={checkedAt} />
        )}

        {data && data.status !== "invalid" && <IssuedCopy data={data} />}

        <p className="mt-6 text-center text-[0.8125rem] leading-relaxed text-[#5b7079]">
          This is a public verification page. No account or sign-in is needed to use it.
        </p>
        <Link
          to="/"
          className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-white/85 py-1.5 pl-2 pr-3.5 no-underline ring-1 ring-[#dfe7e9] transition-colors hover:bg-white"
        >
          <img src="/holyapp-logo.webp" alt="" className="h-6 w-6" />
          <span className="text-[0.8125rem] text-[#5b7079]">
            Powered by <span className="font-bold text-[#0e3b46]">HolyApp</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function ResultCard({
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
  const copy = OUTCOMES[outcome];
  const tone = TONES[copy.tone];

  return (
    <article className="relative overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgb(14_59_70/0.06),0_24px_48px_-28px_rgb(14_59_70/0.45)] ring-1 ring-[#dfe7e9]">
      <CornerMarks className={tone.mark} />

      <header className={`px-6 pb-8 pt-10 text-center ${tone.band}`}>
        <span className={`mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border border-dashed ${tone.ring}`}>
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-[0_10px_22px_-10px_rgb(0_0_0/0.55)] ${tone.icon}`}
          >
            <StatusIcon kind={copy.icon} />
          </span>
        </span>
        <h1 className={`verify-serif mt-5 text-[1.875rem] leading-tight sm:text-[2.125rem] ${tone.title}`}>{copy.title}</h1>
        <p className="mx-auto mt-2 max-w-[360px] text-[0.9375rem] leading-relaxed text-[#4c6168]">{copy.detail}</p>
      </header>

      <div className="px-6 pb-7 pt-7 sm:px-8">
        {data ? (
          <>
            <p className="text-center text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[#5b7079]">
              Certificate holder
            </p>
            <p className="verify-serif mt-1 text-center text-[1.625rem] leading-tight text-[#13262b]">{data.holderName}</p>
            <dl className="mt-6 divide-y divide-[#e6ecee] border-y border-[#e6ecee]">
              <Row label="Certificate type">{TYPE_LABEL[data.sacramentType] ?? data.sacramentType}</Row>
              <Row label="Issuing parish">{data.parishName}</Row>
              <Row label="Date issued">{formatIssued(data.issuedAt)}</Row>
              <Row label="Reference no.">
                <span className="font-mono text-[0.875rem] tracking-tight">{data.code}</span>
              </Row>
            </dl>
            {data.status === "superseded" && (
              <Notice className={tone.notice}>
                A newer certificate has been issued for this record. Please ask{" "}
                <strong className="font-semibold">{data.parishName}</strong> for the current copy.
              </Notice>
            )}
            {data.status === "invalid" && (
              <Notice className={tone.notice}>
                {data.reason ? (
                  <>
                    <strong className="font-semibold">Reason given by the parish:</strong> {data.reason}
                  </>
                ) : (
                  <>
                    Contact <strong className="font-semibold">{data.parishName}</strong> for details.
                  </>
                )}
              </Notice>
            )}
          </>
        ) : outcome === "unavailable" ? (
          <>
            <Notice className={tone.notice}>
              Check your connection and try again. If it keeps happening, contact the parish that issued the
              certificate.
            </Notice>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#16798c] px-5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-[#0e3b46] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#8ed8d2]"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <Notice className={tone.notice}>
              This certificate could not be matched to our records. Contact the parish that issued it to confirm it is
              authentic. A mistyped or damaged code can cause this, so it isn't necessarily a sign of tampering.
            </Notice>
            <p className="mt-6 text-center text-[0.8125rem] text-[#5b7079]">Code scanned</p>
            <p className="mt-1.5 text-center">
              <span className="inline-block rounded-lg bg-[#edf1f2] px-3 py-1.5 font-mono text-[0.875rem] text-[#13262b]">
                {hash ? shortCode(hash) : "—"}
              </span>
            </p>
          </>
        )}
      </div>

      <details className="border-t border-[#e6ecee]">
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-8 py-4 text-[0.9375rem] font-semibold text-[#13262b] hover:bg-[#f7fafa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8ed8d2]">
          Technical verification details
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="verify-chevron h-4 w-4 shrink-0 text-[#5b7079] transition-transform" aria-hidden="true">
            <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <dl className="space-y-3 px-8 pb-6 text-[0.8125rem]">
          <TechRow label="Verification code">
            <span className="break-all font-mono">{hash || "—"}</span>
          </TechRow>
          {data && (
            <>
              <TechRow label="Certificate no.">
                <span className="font-mono">{data.code}</span>
              </TechRow>
              {data.fields?.registerRef && data.fields.registerRef !== "—" && (
                <TechRow label="Register entry">{data.fields.registerRef}</TechRow>
              )}
              <TechRow label="Register status">{STATUS_LABEL[data.status]}</TechRow>
            </>
          )}
          <TechRow label="Checked">
            {checkedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </TechRow>
          <TechRow label="Checked against">The parish register kept on HolyApp</TechRow>
        </dl>
      </details>
    </article>
  );
}

/** The certificate exactly as the parish issued it, to compare with the paper in hand. */
function IssuedCopy({ data }: { data: Verification }) {
  return (
    <details className="mt-4 overflow-hidden rounded-[20px] bg-white ring-1 ring-[#dfe7e9]">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-6 py-4 text-[0.9375rem] font-semibold text-[#13262b] hover:bg-[#f7fafa] sm:px-8">
        Compare with the certificate as issued
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="verify-chevron h-4 w-4 shrink-0 text-[#5b7079] transition-transform" aria-hidden="true">
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="overflow-x-auto border-t border-[#e6ecee] bg-[#f3f7f7] p-3">
        <div style={{ width: CERT_SHEET_WIDTH }}>
          <CertificateDocument
            parish={parishFrom(data)}
            sacramentType={data.sacramentType}
            subjectName={data.holderName}
            fields={data.fields ?? { requestId: "", registerRef: "—", certCode: data.code }}
            appearance={{
              signatoryName: data.signatoryName || "",
              signatoryTitle: data.signatoryTitle || "",
              numberingPrefix: "",
              footerText: data.footerText || "",
            }}
          />
        </div>
      </div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <dt className="shrink-0 pt-0.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[#5b7079]">{label}</dt>
      <dd className="min-w-0 text-right text-[0.9375rem] leading-snug text-[#13262b]">{children}</dd>
    </div>
  );
}

function TechRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
      <dt className="text-[#5b7079]">{label}</dt>
      <dd className="text-[#13262b]">{children}</dd>
    </div>
  );
}

function Notice({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`mt-6 flex gap-3 rounded-2xl px-4 py-3.5 text-[0.875rem] leading-relaxed ${className}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 6.5v4M10 13.5h.01" strokeLinecap="round" />
      </svg>
      <p>{children}</p>
    </div>
  );
}

/** Small crosses in the card's corners, as on a printed certificate. */
function CornerMarks({ className }: { className: string }) {
  const spots = ["left-3 top-3", "right-3 top-3", "bottom-3 left-3", "bottom-3 right-3"];
  return (
    <>
      {spots.map((spot) => (
        <svg
          key={spot}
          viewBox="0 0 14 14"
          className={`pointer-events-none absolute z-10 h-3.5 w-3.5 ${spot} ${className}`}
          aria-hidden="true"
        >
          <path d="M7 0v14M0 7h14" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ))}
    </>
  );
}

function StatusIcon({ kind }: { kind: "check" | "alert" | "cross" }) {
  if (kind === "check") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-7 w-7" aria-hidden="true">
        <path d="m5.5 12.5 4.5 4.5 8.5-9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "cross") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-7 w-7" aria-hidden="true">
        <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-7 w-7" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.5h.01" strokeLinecap="round" />
    </svg>
  );
}
