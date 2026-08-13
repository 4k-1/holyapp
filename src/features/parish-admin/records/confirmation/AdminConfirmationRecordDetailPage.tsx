import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, NoteIcon, UserIcon } from "@/features/parish-admin/components/AdminForm";
import {
  RecordDetailBackLink,
  RecordDetailInfoRow,
  RecordDetailSection,
} from "@/features/parish-admin/components/AdminRecordDetailSection";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { DropletIcon, ShieldIcon } from "@/components/ui/icons/SacramentIcons";
import {
  generateConfirmationCertificate,
  getConfirmationRecord,
} from "@/features/parish-admin/records/api/confirmationRecordsApi";
import { getBaptismalRecord } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { recordFullName as baptismFullName } from "@/features/parish-admin/records/baptismalHelpers";
import { useAsync } from "@/hooks/useAsync";
import {
  certStatusTone,
  confirmationRecordRef,
  encodedByLabel,
  formatDateTime,
  formatRecordDate,
  initials,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/confirmationHelpers";
import type { Parish } from "@/types";

export function AdminConfirmationRecordDetailPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: record, loading, refetch } = useAsync(() => getConfirmationRecord(parish.id, id), [parish.id, id]);
  const [generating, setGenerating] = useState(false);

  const { data: linkedBaptism } = useAsync(
    () =>
      record?.baptismalRecordId
        ? getBaptismalRecord(parish.id, record.baptismalRecordId)
        : Promise.resolve(undefined),
    [parish.id, record?.baptismalRecordId]
  );

  if (loading) {
    return (
      <div>
        <RecordDetailBackLink />
        <p className="text-[13.5px] text-admin-ink-muted">Loading record…</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div>
        <RecordDetailBackLink />
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Record not found</h1>
        <p className="text-[13.5px] text-admin-ink-muted">
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

  async function handleGenerateCertificate() {
    setGenerating(true);
    try {
      await generateConfirmationCertificate(parish.id, record!.id);
      refetch();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[920px]">
      <RecordDetailBackLink />

      <AdminCard className="mb-[18px] flex flex-wrap items-start justify-between gap-4 p-[26px] px-7">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#E3E8F5] font-serif text-[17px] font-bold text-[#3B4E8A] ring-1 ring-inset ring-[#3B4E8A]/20">
            {initials(name)}
          </div>
          <div>
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.6px] text-[#3B4E8A]">
              Confirmation Record
            </p>
            <h1 className="mb-1.5 font-serif text-[24px] font-semibold leading-tight text-admin-ink">{name}</h1>
            <p className="mb-2.5 text-[13px] text-admin-ink-muted">
              Confirmed {formatRecordDate(record.dateOfConfirmation)} at {record.placeOfConfirmation}
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
              {record.isAdult && <AdminBadge tone="amber">Adult confirmation</AdminBadge>}
              {record.isPriorMarriage && <AdminBadge tone="muted">Prior marriage</AdminBadge>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <AdminButton onClick={handleGenerateCertificate} disabled={generating}>
            <FileIcon />
            {generating ? "Generating…" : "Generate Certificate"}
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
            <RecordDetailInfoRow label="Place of confirmation" value={record.placeOfConfirmation} />
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
                <Link
                  to={`../../baptismal/${encodeURIComponent(record.baptismalRecordId)}`}
                  className="text-right text-[13.5px] font-semibold text-admin-green-700 hover:underline"
                >
                  {linkedBaptism ? baptismFullName(linkedBaptism) : record.baptismalRecordId} — Bk{" "}
                  {linkedBaptism?.bookNumber ?? "?"}:{linkedBaptism?.pageNumber ?? "?"}:
                  {linkedBaptism?.entryNumber ?? "?"}
                </Link>
              </div>
            )}
          </div>
        </RecordDetailSection>
      )}

      {record.remarks && (
        <RecordDetailSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Remarks">
          <div className="p-5 px-[22px]">
            <p className="text-[13.5px] leading-relaxed text-admin-ink">{record.remarks}</p>
          </div>
        </RecordDetailSection>
      )}

      <RecordDetailSection tone="neutral" icon={<ClockIcon className="h-4.5 w-4.5" />} title="Record Metadata">
        <div className="p-5 px-[22px]">
          <RecordDetailInfoRow label="Register reference" value={confirmationRecordRef(record)} />
          <RecordDetailInfoRow label="Encoded by" value={encodedByLabel(record.encodedBy)} />
          <RecordDetailInfoRow label="Created" value={formatDateTime(record.createdAt)} />
          <RecordDetailInfoRow label="Last updated" value={formatDateTime(record.updatedAt)} last />
        </div>
      </RecordDetailSection>

      <RecordDetailSection
        tone="green"
        icon={<FileIcon className="h-4.5 w-4.5" />}
        title="Issued Certificates"
        className="mb-0"
      >
        <div className="px-[22px]">
          {certs.length === 0 ? (
            <p className="py-5 text-[11.5px] text-admin-ink-faint">
              No certificates have been generated from this record yet.
            </p>
          ) : (
            certs.map((c, i) => (
              <div
                key={c.code}
                className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                  i < certs.length - 1 ? "border-b border-admin-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-admin-ink">
                    {c.type}
                    <AdminBadge tone={certStatusTone(c.status)}>{c.status}</AdminBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-admin-ink-muted">
                    Issued {c.date} by {c.by} · {c.code}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <AdminButton variant="secondary" size="sm" onClick={() => console.info("[mock] verify", c.code)}>
                    <ScanIcon />
                    Verify
                  </AdminButton>
                  <AdminButton variant="secondary" size="sm" onClick={() => console.info("[mock] download", c.code)}>
                    <DownloadIcon />
                    Download
                  </AdminButton>
                </div>
              </div>
            ))
          )}
        </div>
      </RecordDetailSection>
    </div>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 3 14 8 19 8" strokeLinejoin="round" />
    </svg>
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

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M12 3v12" strokeLinecap="round" />
      <polyline points="7 11 12 16 17 11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4.5 w-4.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
