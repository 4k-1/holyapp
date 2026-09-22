import { useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";

interface Verification {
  status: "valid" | "superseded" | "invalid";
  code: string;
  holderName: string;
  sacramentType: string;
  issuedAt: string;
  parishName: string;
  reason?: string;
}

const statusCopy: Record<Verification["status"], { title: string; detail: string }> = {
  valid: {
    title: "Valid certificate",
    detail: "This certificate is the current extract from the parish register.",
  },
  superseded: {
    title: "Superseded certificate",
    detail: "A newer certificate was issued for this record. This copy is no longer the current one.",
  },
  invalid: {
    title: "Revoked certificate",
    detail: "The parish office has revoked this certificate.",
  },
};

export function VerifyCertificatePage() {
  const { hash = "" } = useParams();
  const { data, loading, error } = useAsync(
    () => apiFetch<Verification>(`/certificates/verify/${encodeURIComponent(hash)}`, { auth: false }),
    [hash]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f3ee] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#e4ddd2] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8175]">Certificate check</p>
        {loading ? (
          <p className="mt-3 text-sm text-[#5c564e]">Checking this certificate…</p>
        ) : error || !data ? (
          <h1 className="mt-2 font-serif text-2xl font-bold text-[#1d1a16]">Certificate not found</h1>
        ) : (
          <>
            <h1 className="mt-2 font-serif text-2xl font-bold text-[#1d1a16]">{statusCopy[data.status].title}</h1>
            <p className="mt-2 text-sm text-[#5c564e]">{statusCopy[data.status].detail}</p>
            <dl className="mt-5 space-y-2 text-sm text-[#1d1a16]">
              <div className="flex justify-between gap-4">
                <dt className="text-[#8a8175]">Parish</dt>
                <dd className="text-right">{data.parishName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#8a8175]">Name</dt>
                <dd className="text-right">{data.holderName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#8a8175]">Number</dt>
                <dd className="text-right">{data.code}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#8a8175]">Issued</dt>
                <dd className="text-right">{data.issuedAt}</dd>
              </div>
            </dl>
            {data.reason && <p className="mt-4 text-sm text-[#7A3C35]">{data.reason}</p>}
          </>
        )}
      </div>
    </div>
  );
}
