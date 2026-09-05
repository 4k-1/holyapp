import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, FileIcon, FamilyIcon, NoteIcon, UserIcon } from "@/features/parish-admin/components/AdminForm";
import {
  RecordDetailBackLink,
  RecordDetailInfoRow,
  RecordDetailMeta,
  RecordDetailSection,
} from "@/features/parish-admin/components/AdminRecordDetailSection";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { CandleIcon, ShieldIcon } from "@/components/ui/icons/SacramentIcons";
import { generateDeathCertificate, getDeathRecord } from "@/features/parish-admin/records/api/deathRecordsApi";
import { AdminGenerateCertificateModal } from "@/features/parish-admin/records/AdminGenerateCertificateModal";
import { IssuedCertificatesSection } from "@/features/parish-admin/records/IssuedCertificatesSection";
import { useAsync } from "@/hooks/useAsync";
import {
  DEATH_SACRAMENT_LABELS,
  deathCertificateFields,
  encodedByLabel,
  formatAge,
  formatDateTime,
  formatRecordDate,
  initials,
  kinFullName,
  recordFullName,
} from "@/features/parish-admin/records/deathHelpers";
import type { IssuedRecordCertificate } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

export function AdminDeathRecordDetailPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: record, loading, refetch } = useAsync(() => getDeathRecord(parish.id, id), [parish.id, id]);
  const [certificateModal, setCertificateModal] = useState<IssuedRecordCertificate | "new" | null>(null);

  if (loading && !record) {
    return (
      <div>
        <RecordDetailBackLink />
        <p className="text-admin-body text-admin-ink-muted">Loading record…</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div>
        <RecordDetailBackLink />
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Record not found</h1>
        <p className="text-admin-body text-admin-ink-muted">
          This death record is not available for this parish.
        </p>
      </div>
    );
  }

  const name = recordFullName(record);
  const certs = record.certificates;

  return (
    <div className="mx-auto max-w-[920px]">
      <RecordDetailBackLink />

      <AdminCard className="mb-[18px] flex flex-wrap items-start justify-between gap-4 p-[26px] px-7">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-admin-surface-alt font-serif text-admin-group font-bold text-admin-ink-muted ring-1 ring-inset ring-admin-border-strong">
            {initials(name)}
          </div>
          <div>
            <p className="mb-1 text-admin-label font-bold uppercase tracking-admin-label text-admin-ink-muted">
              Death Record
            </p>
            <h1 className="mb-1.5 font-serif text-admin-page font-semibold leading-tight text-admin-ink">{name}</h1>
            <p className="mb-2.5 text-admin-body text-admin-ink-muted">
              Died {formatRecordDate(record.dateOfDeath)} · Buried {formatRecordDate(record.dateOfBurial)} at{" "}
              {record.placeOfBurial}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-border bg-admin-surface-alt px-2.5 py-1 font-mono text-xs text-admin-ink-muted">
                Book {record.bookNumber}
                <span className="text-admin-border-strong">/</span>
                Page {record.pageNumber}
                <span className="text-admin-border-strong">/</span>
                Entry {record.entryNumber}
              </span>
              <AdminBadge tone={record.status === "Archived" ? "muted" : "green"}>{record.status}</AdminBadge>
              {record.deceasedStatus && <AdminBadge tone="muted">{record.deceasedStatus}</AdminBadge>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <AdminButton onClick={() => setCertificateModal("new")}>
            <FileIcon />
            Generate Certificate
          </AdminButton>
          <div className="flex gap-2">
            <AdminButton variant="secondary" className="flex-1" onClick={() => navigate("edit")}>
              <EditIcon />
              Edit
            </AdminButton>
            <AdminButton
              variant="danger"
              className="flex-1"
              onClick={() => console.info("[mock] archive record", record.id)}
            >
              <TrashIcon />
              Archive
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <RecordDetailSection tone="blue" icon={<UserIcon className="h-4.5 w-4.5" />} title="Personal Information">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow label="Full name" value={name} />
            <RecordDetailInfoRow label="Residence" value={record.residence ?? "—"} />
            <RecordDetailInfoRow label="Age at death" value={formatAge(record)} last />
          </div>
        </RecordDetailSection>

        <RecordDetailSection tone="gold" icon={<CandleIcon className="h-4.5 w-4.5" />} title="Death & Burial">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow label="Date of death" value={formatRecordDate(record.dateOfDeath)} />
            <RecordDetailInfoRow label="Date of burial" value={formatRecordDate(record.dateOfBurial)} />
            <RecordDetailInfoRow label="Place of burial" value={record.placeOfBurial} />
            {record.nicheNumber && <RecordDetailInfoRow label="Niche number" value={record.nicheNumber} />}
            {record.nicheType && <RecordDetailInfoRow label="Niche type" value={record.nicheType} />}
            <RecordDetailInfoRow label="Minister" value={record.minister} />
            {record.causeOfDeath && (
              <RecordDetailInfoRow label="Cause of death" value={record.causeOfDeath} last />
            )}
          </div>
        </RecordDetailSection>
      </div>

      {record.sacramentsReceived.length > 0 && (
        <RecordDetailSection tone="amber" icon={<ShieldIcon className="h-4.5 w-4.5" />} title="Sacraments Received">
          <div className="p-5 px-[22px]">
            <div className="flex flex-wrap gap-2">
              {record.sacramentsReceived.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center rounded-full border border-admin-border bg-admin-surface-alt px-3 py-1 text-admin-support font-semibold text-admin-ink"
                >
                  {DEATH_SACRAMENT_LABELS[s.sacramentName]}
                </span>
              ))}
            </div>
          </div>
        </RecordDetailSection>
      )}

      {record.kin.length > 0 && (
        <RecordDetailSection tone="rose" icon={<FamilyIcon className="h-4.5 w-4.5" />} title="Next of Kin">
          <div className="p-5 px-[22px]">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {record.kin.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-2.5 rounded-[9px] border border-admin-border bg-admin-surface-alt px-3.5 py-2.5"
                >
                  <span className="text-admin-body font-semibold text-admin-ink">{kinFullName(k)}</span>
                  <span className="inline-flex items-center rounded-full bg-[#F8D6E0] px-2.5 py-1 text-admin-label font-semibold text-[#B85A75]">
                    {k.relationToDeceased}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </RecordDetailSection>
      )}

      {record.remarks && (
        <RecordDetailSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Remarks">
          <div className="p-5 px-[22px]">
            <p className="text-admin-body leading-relaxed text-admin-ink">{record.remarks}</p>
          </div>
        </RecordDetailSection>
      )}

      <IssuedCertificatesSection certificates={certs} onView={(c) => setCertificateModal(c)} />

      <RecordDetailMeta
        encodedBy={encodedByLabel(record.encodedBy)}
        created={formatDateTime(record.createdAt)}
        updated={formatDateTime(record.updatedAt)}
      />

      {certificateModal && (
        <AdminGenerateCertificateModal
          parish={parish}
          sacramentType="death"
          subjectName={name}
          fields={deathCertificateFields(record)}
          issued={certificateModal === "new" ? undefined : certificateModal}
          onClose={() => setCertificateModal(null)}
          onIssue={() => generateDeathCertificate(parish.id, record.id)}
          onIssued={(cert) => {
            setCertificateModal(cert);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
      <path d="M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinejoin="round" />
    </svg>
  );
}
