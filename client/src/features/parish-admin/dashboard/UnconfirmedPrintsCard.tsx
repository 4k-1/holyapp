import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PrintCheck } from "@/features/parish-admin/components/certificate/PrintCheck";
import {
  listUnconfirmedCertificates,
  type UnconfirmedCertificate,
} from "@/features/parish-admin/requests/api/requestsAdminApi";

function issuedLabel(at: string) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Printed certificates nobody has said printed correctly (A3). Each row asks the same question
 * as the print window; the card disappears once every copy is answered.
 */
export function UnconfirmedPrintsCard() {
  const [copies, setCopies] = useState<UnconfirmedCertificate[]>([]);

  useEffect(() => {
    listUnconfirmedCertificates()
      .then(setCopies)
      .catch(() => setCopies([]));
  }, []);

  if (copies.length === 0) return null;

  const answered = (id: string) => setCopies((list) => list.filter((c) => c.id !== id));

  return (
    <section className="admin-dash__card mb-5 p-4 sm:mb-6 sm:p-5" aria-label="Printed, not confirmed">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[0.95rem] font-semibold text-[var(--dash-ink)]">Printed, not confirmed</h2>
        <span className="admin-dash__pill admin-dash__pill--amber">{copies.length}</span>
      </div>
      <p className="admin-dash__muted mb-3 text-admin-support">
        These certificates were printed, but nobody said whether they came out right.
      </p>
      <ul className="space-y-3">
        {copies.map((c) => (
          <li key={c.id} className="space-y-1.5">
            <p className="text-admin-support text-[var(--dash-ink)]">
              <span className="font-semibold">{c.holderName}</span>
              <span className="admin-dash__muted">
                {" "}
                · issued {issuedLabel(c.issuedAt)} by {c.issuedBy} ·{" "}
              </span>
              <Link to={c.recordPath} className="font-semibold text-admin-green-700 hover:underline">
                Open record
              </Link>
            </p>
            <PrintCheck
              certificateId={c.id}
              code={c.code}
              onConfirmed={() => answered(c.id)}
              onSpoiled={() => answered(c.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
