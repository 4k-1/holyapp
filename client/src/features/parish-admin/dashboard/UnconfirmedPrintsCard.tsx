import { Link } from "react-router-dom";
import { PrintCheck } from "@/features/parish-admin/components/certificate/PrintCheck";
import type { UnconfirmedCertificate } from "@/features/parish-admin/requests/api/requestsAdminApi";

function issuedLabel(at: string) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Printed certificates nobody has said printed correctly (A3), opened from the "Confirm" task. Each row asks the
 * same question as the print window and leaves the list once answered.
 */
export function UnconfirmedPrintsList({
  copies,
  onAnswered,
}: {
  copies: UnconfirmedCertificate[];
  onAnswered: (id: string) => void;
}) {
  return (
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
            onConfirmed={() => onAnswered(c.id)}
            onSpoiled={() => onAnswered(c.id)}
          />
        </li>
      ))}
    </ul>
  );
}
