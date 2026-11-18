import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, FileIcon, NoteIcon, UserIcon } from "@/features/parish-admin/components/AdminForm";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { canEditSacramentalRecords } from "@/features/parish-admin/permissions";
import {
  RecordDetailBackLink,
  RecordDetailInfoRow,
  RecordDetailMeta,
  RecordDetailSection,
} from "@/features/parish-admin/components/AdminRecordDetailSection";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { DropletIcon, ShieldIcon } from "@/components/ui/icons/SacramentIcons";
import { archiveConfirmationRecord, generateConfirmationCertificate, getConfirmationRecord, unarchiveConfirmationRecord } from "@/features/parish-admin/records/api/confirmationRecordsApi";
import { AdminArchiveRecordModal } from "@/features/parish-admin/records/AdminArchiveRecordModal";
import { AdminGenerateCertificateModal } from "@/features/parish-admin/records/AdminGenerateCertificateModal";
import { IssuedCertificatesSection } from "@/features/parish-admin/records/IssuedCertificatesSection";
import { getBaptismalRecord } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { baptismRecordRef, recordFullName as baptismFullName } from "@/features/parish-admin/records/baptismalHelpers";
import { LinkedRecordLink } from "@/features/parish-admin/records/LinkedRecordLink";
import { recordDetailPath } from "@/features/parish-admin/records/recordPaths";
import { useAsync } from "@/hooks/useAsync";
import {
  confirmationCertificateFields,
  encodedByLabel,
  formatDateTime,
  formatRecordDate,
  initials,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/confirmationHelpers";
import type { IssuedRecordCertificate } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import { PAGE_TITLE_CLASS, RECORD_DETAIL_WIDTH_CLASS } from "@/features/parish-admin/components/adminPageStyles";
import { userCan } from "@/features/parish-admin/access";

export function AdminConfirmationRecordDetailPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const canEdit = canEditSacramentalRecords(user?.role);
  // Whoever can see a record can issue its certificate (View on Registers is enough).
  const canIssue = userCan(user, "registers", "view");
  const id = decodeURIComponent(recordId);

  const { data: record, loading, refetch } = useAsync(() => getConfirmationRecord(parish.id, id), [parish.id, id]);
  const [certificateModal, setCertificateModal] = useState<IssuedRecordCertificate | "new" | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { data: linkedBaptism } = useAsync(
    () =>
      record?.baptismalRecordId
        ? getBaptismalRecord(parish.id, record.baptismalRecordId)
        : Promise.resolve(undefined),
    [parish.id, record?.baptismalRecordId]
  );

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
        <h1 className={`mb-1 ${PAGE_TITLE_CLASS}`}>Record not found</h1>
        <p className="text-admin-body text-admin-ink-muted">
          This confirmation record is not available for this parish.
        </p>
      </div>
    );
  }

  const name = recordFullName(record);
  const certs = record.certificates;
  const flags = [
    record.isAdult && "Adult confirmation",
    record.isPriorMarriage && "Prior marriage",
  ].filter(Boolean) as string[];

  return (
    <div className={RECORD_DETAIL_WIDTH_CLASS}>
      <RecordDetailBackLink />

      <AdminCard className="mb-[18px] flex flex-wrap items-start justify-between gap-4 p-[26px] px-7">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#E3E8F5] font-serif text-admin-group font-bold text-[#3B4E8A] ring-1 ring-inset ring-[#3B4E8A]/20">
            {initials(name)}
          </div>
          <div>
            <p className="mb-1 text-admin-label font-bold uppercase tracking-admin-label text-[#3B4E8A]">
              Confirmation Record
            </p>
            <h1 className={`mb-1.5 ${PAGE_TITLE_CLASS}`}>{name}</h1>
            <p className="mb-2.5 text-admin-body text-admin-ink-muted">
              Confirmed {formatRecordDate(record.dateOfConfirmation)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-admin-border bg-admin-surface-alt px-2.5 py-1 font-mono text-xs text-admin-ink-muted">
                Book {record.bookNumber}
                <span className="text-admin-border-strong">/</span>
                Page {record.pageNumber}
                <span className="text-admin-border-strong">/</span>
                Entry {record.entryNumber}
              </span>
              {record.status === "Archived" && <AdminBadge tone="muted">Archived</AdminBadge>}
              {record.isAdult && <AdminBadge tone="amber">Adult confirmation</AdminBadge>}
              {record.isPriorMarriage && <AdminBadge tone="muted">Prior marriage</AdminBadge>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {canIssue && (
            <AdminButton onClick={() => setCertificateModal("new")}>
              <FileIcon />
              Generate Certificate
              </AdminButton>
          )}
          {canEdit && (
            <div className="flex gap-2">
              <AdminButton variant="secondary" className="flex-1" onClick={() => navigate("edit")}>
                <EditIcon />
                Edit
              </AdminButton>
              {record.status === "Archived" ? (
                <AdminButton variant="secondary" className="flex-1" onClick={() => setArchiveOpen(true)}>
                  Restore
                </AdminButton>
              ) : (
                <AdminButton variant="danger" className="flex-1" onClick={() => setArchiveOpen(true)}>
                  <TrashIcon />
                  Archive
                </AdminButton>
              )}
            </div>
          )}
        </div>
      </AdminCard>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <RecordDetailSection tone="blue" icon={<UserIcon className="h-4.5 w-4.5" />} title="Personal Information">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow label="Full name" value={name} />
            <RecordDetailInfoRow label="Sex" value={record.sex ?? "—"} />
            <RecordDetailInfoRow label="Address" value={record.address ?? "—"} />
            <RecordDetailInfoRow
              label="Date of birth"
              value={record.dateOfBirth ? formatRecordDate(record.dateOfBirth) : "—"}
              last
            />
          </div>
        </RecordDetailSection>

        <RecordDetailSection tone="gold" icon={<ShieldIcon className="h-4.5 w-4.5" />} title="Confirmation Information">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow label="Date of confirmation" value={formatRecordDate(record.dateOfConfirmation)} />
            <RecordDetailInfoRow label="Minister" value={record.minister} />
            <RecordDetailInfoRow label="Father's name" value={recordFatherName(record) || "—"} />
            <RecordDetailInfoRow label="Mother's name" value={recordMotherName(record) || "—"} last />
            {flags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-admin-border pt-3">
                {flags.map((flag) => (
                  <AdminBadge key={flag} tone={flag.includes("Adult") ? "amber" : "muted"}>
                    {flag}
                  </AdminBadge>
                ))}
              </div>
            )}
          </div>
        </RecordDetailSection>
      </div>

      {(record.baptismalRecordId || record.baptismDate || record.baptismPlace) && (
        <RecordDetailSection tone="green" icon={<DropletIcon className="h-4.5 w-4.5" />} title="Baptism Reference">
          <div className="p-5 px-[22px]">
            {record.baptismDate && (
              <RecordDetailInfoRow label="Baptismal date" value={formatRecordDate(record.baptismDate)} />
            )}
            {record.baptismPlace && (
              <RecordDetailInfoRow label="Place of baptism" value={record.baptismPlace} last={!record.baptismalRecordId} />
            )}
            {record.baptismalRecordId && (
              <div className="flex items-baseline justify-between gap-4 py-[10.5px]">
                <span className="shrink-0 text-xs text-admin-ink-muted">Linked baptismal record</span>
                <LinkedRecordLink
                  to={recordDetailPath(parish.slug, "baptismal", record.baptismalRecordId)}
                  name={linkedBaptism ? baptismFullName(linkedBaptism) : record.baptismalRecordId}
                  registerRef={
                    linkedBaptism
                      ? baptismRecordRef(linkedBaptism)
                      : "?:?:?"
                  }
                />
              </div>
            )}
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

      {archiveOpen && (
        <AdminArchiveRecordModal
          recordName={name}
          registerLabel="confirmation record"
          intent={record.status === "Archived" ? "restore" : "archive"}
          onClose={() => setArchiveOpen(false)}
          onConfirm={() =>
            (record.status === "Archived"
              ? unarchiveConfirmationRecord(parish.id, record.id)
              : archiveConfirmationRecord(parish.id, record.id)
            ).then(() => refetch())
          }
        />
      )}

      {certificateModal && (
        <AdminGenerateCertificateModal
          parish={parish}
          sacramentType="confirmation"
          subjectName={name}
          fields={confirmationCertificateFields(record)}
          issued={certificateModal === "new" ? undefined : certificateModal}
          onClose={() => setCertificateModal(null)}
          onIssue={(purpose) => generateConfirmationCertificate(parish.id, record.id, purpose)}
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
