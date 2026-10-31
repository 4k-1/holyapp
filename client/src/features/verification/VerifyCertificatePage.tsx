import { useParams } from "react-router-dom";
import { CertificateDocument } from "@/features/parish-admin/components/CertificateDocument";
import { CERT_SHEET_WIDTH } from "@/features/parish-admin/components/certificate/constants";
import { useAsync } from "@/hooks/useAsync";
import type { Parish, SacramentType } from "@/types";
import mtcarmellogo from "@/assets/mtcarmellogo.png";

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

const statusCopy: Record<Verification["status"], { title: string; detail: string; tone: string }> = {
  valid: {
    title: "Valid certificate",
    detail: "This certificate is the current extract from the parish register.",
    tone: "border-primary/20 text-primary",
  },
  superseded: {
    title: "Superseded certificate",
    detail: "A newer certificate was issued for this record. This copy is no longer the current one.",
    tone: "border-[#8a5a12]/30 text-[#8a5a12]",
  },
  invalid: {
    title: "Revoked certificate",
    detail: "The parish office has revoked this certificate.",
    tone: "border-[#7A3C35]/25 text-[#7A3C35]",
  },
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
    throw new Error("This certificate could not be checked. Try again in a moment.");
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

export function VerifyCertificatePage() {
  const { hash = "" } = useParams();
  const { data, loading, error } = useAsync(() => loadVerification(hash), [hash]);
  const copy = data ? statusCopy[data.status] : null;

  return (
    <div className="min-h-screen bg-[#ececec] px-4 py-8">
      <div className="mx-auto w-full max-w-[640px]">
        {loading ? (
          <p className="text-sm text-[#5c564e]">Checking this certificate…</p>
        ) : error || !data || !copy ? (
          <div className="rounded-2xl border border-[#e4ddd2] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8175]">Certificate check</p>
            <h1 className="mt-2 font-serif text-2xl font-bold text-[#1d1a16]">
              {error instanceof Error && error.message.startsWith("This certificate could not be checked")
                ? "Could not check this certificate"
                : "Certificate not found"}
            </h1>
            {error instanceof Error && error.message.startsWith("This certificate could not be checked") && (
              <p className="mt-2 text-sm text-[#5c564e]">{error.message}</p>
            )}
          </div>
        ) : (
          <>
            <div className={`mb-4 rounded-2xl border bg-white px-4 py-3 ${copy.tone}`}>
              <p className="font-serif text-xl font-bold">{copy.title}</p>
              <p className="mt-1 text-sm">{copy.detail}</p>
              {data.reason && <p className="mt-2 text-sm">{data.reason}</p>}
            </div>
            <div className="overflow-x-auto">
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
          </>
        )}
      </div>
    </div>
  );
}
