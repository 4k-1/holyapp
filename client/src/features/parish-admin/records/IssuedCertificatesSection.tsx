import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton, NoteIcon, PrintIcon } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailSection } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { certStatusTone } from "@/features/parish-admin/records/baptismalHelpers";
import type { IssuedRecordCertificate } from "@/features/parish-admin/records/types";

export function IssuedCertificatesSection({
  certificates,
  onView,
  onRevoke,
}: {
  certificates: IssuedRecordCertificate[];
  onView: (cert: IssuedRecordCertificate) => void;
  onRevoke?: (cert: IssuedRecordCertificate) => void;
}) {
  return (
    <RecordDetailSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Issued certificates" className="mb-0">
      <div className="px-[22px]">
        {certificates.length === 0 ? (
          <p className="py-5 text-admin-label text-admin-ink-faint">
            No certificates have been generated from this record yet.
          </p>
        ) : (
          certificates.map((c, i) => (
            <div
              key={c.code}
              className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                i < certificates.length - 1 ? "border-b border-admin-border" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-admin-body font-semibold text-admin-ink">
                  {c.type}
                  <AdminBadge tone={certStatusTone(c.status)}>{c.status}</AdminBadge>
                  {c.status === "Valid" && c.printConfirmed === false && (
                    <AdminBadge tone="amber">Not confirmed</AdminBadge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-admin-ink-muted">
                  Issued {c.date} by {c.by} · {c.code}
                  {c.reprints ? ` · Reprinted ${c.reprints}×` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.status === "Valid" && c.id && onRevoke && (
                  <AdminButton variant="danger" size="sm" onClick={() => onRevoke(c)}>
                    Revoke
                  </AdminButton>
                )}
                <AdminButton variant="secondary" size="sm" onClick={() => onView(c)}>
                  <PrintIcon />
                  View & print
                </AdminButton>
              </div>
            </div>
          ))
        )}
      </div>
    </RecordDetailSection>
  );
}
