import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminBadge } from "@/components/ui/AdminBadge";
import {
  generateMarriageCertificate,
  getMarriageRecord,
} from "@/features/parish-admin/records/api/marriageRecordsApi";
import { getBaptismalRecord } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { recordFullName } from "@/features/parish-admin/records/baptismalHelpers";
import { useAsync } from "@/hooks/useAsync";
import {
  brideFullName,
  certStatusTone,
  coupleLabel,
  encodedByLabel,
  formatDateTime,
  formatRecordDate,
  groomFullName,
  initials,
  marriageRecordRef,
} from "@/features/parish-admin/records/marriageHelpers";
import type { Parish } from "@/types";

export function AdminMarriageRecordDetailPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: record, loading, refetch } = useAsync(() => getMarriageRecord(parish.id, id), [parish.id, id]);
  const [generating, setGenerating] = useState(false);

  const { data: groomBaptism } = useAsync(
    () =>
      record?.groomBaptismalRecordId
        ? getBaptismalRecord(parish.id, record.groomBaptismalRecordId)
        : Promise.resolve(undefined),
    [parish.id, record?.groomBaptismalRecordId]
  );

  const { data: brideBaptism } = useAsync(
    () =>
      record?.brideBaptismalRecordId
        ? getBaptismalRecord(parish.id, record.brideBaptismalRecordId)
        : Promise.resolve(undefined),
    [parish.id, record?.brideBaptismalRecordId]
  );

  if (loading) {
    return (
      <div className="p-6">
        <BackLink />
        <p className="text-[13.5px] text-admin-ink-muted">Loading record…</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6">
        <BackLink />
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Record not found</h1>
        <p className="text-[13.5px] text-admin-ink-muted">
          This marriage record is not available for this parish.
        </p>
      </div>
    );
  }

  const couple = coupleLabel(record);
  const certs = record.certificates;

  async function handleGenerateCertificate() {
    setGenerating(true);
    try {
      await generateMarriageCertificate(parish.id, record.id);
      refetch();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[920px] p-6">
      <BackLink />

      <AdminCard className="mb-[18px] flex flex-wrap items-start justify-between gap-4 p-[22px] px-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-admin-gold-100 font-serif text-[15px] font-bold text-admin-gold-700">
            {initials(groomFullName(record))}
          </div>
          <div>
            <h1 className="mb-2 text-[22px] font-semibold text-admin-ink">{couple}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-border bg-admin-surface-alt px-2.5 py-1 font-mono text-xs text-admin-ink-muted">
                Book {record.bookNumber}
                <span className="text-admin-border-strong">/</span>
                Page {record.pageNumber}
                <span className="text-admin-border-strong">/</span>
                Entry {record.entryNumber}
              </span>
              <AdminBadge tone={record.status === "Archived" ? "muted" : "green"}>
                {record.status}
              </AdminBadge>
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
        <AdminCard className="p-5 px-[22px]">
          <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Groom
          </h2>
          <InfoRow label="Full name" value={groomFullName(record)} />
          <InfoRow label="Date of birth" value={formatRecordDate(record.groomDateOfBirth)} />
          {record.groomBaptismalRecordId ? (
            <div className="flex items-baseline justify-between gap-4 border-t border-admin-border py-[10.5px]">
              <span className="shrink-0 text-xs text-admin-ink-muted">Baptismal record</span>
              <Link
                to={`../../baptismal/${encodeURIComponent(record.groomBaptismalRecordId)}`}
                className="text-right text-[13.5px] font-semibold text-admin-green-700 hover:underline"
              >
                {groomBaptism ? recordFullName(groomBaptism) : record.groomBaptismalRecordId} — Bk{" "}
                {groomBaptism?.book ?? "?"}:{groomBaptism?.page ?? "?"}:{groomBaptism?.line ?? "?"}
              </Link>
            </div>
          ) : (
            <InfoRow label="Baptismal record" value="Not linked" last />
          )}
        </AdminCard>

        <AdminCard className="p-5 px-[22px]">
          <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Bride
          </h2>
          <InfoRow label="Full name" value={brideFullName(record)} />
          <InfoRow label="Date of birth" value={formatRecordDate(record.brideDateOfBirth)} />
          {record.brideBaptismalRecordId ? (
            <div className="flex items-baseline justify-between gap-4 border-t border-admin-border py-[10.5px]">
              <span className="shrink-0 text-xs text-admin-ink-muted">Baptismal record</span>
              <Link
                to={`../../baptismal/${encodeURIComponent(record.brideBaptismalRecordId)}`}
                className="text-right text-[13.5px] font-semibold text-admin-green-700 hover:underline"
              >
                {brideBaptism ? recordFullName(brideBaptism) : record.brideBaptismalRecordId} — Bk{" "}
                {brideBaptism?.book ?? "?"}:{brideBaptism?.page ?? "?"}:{brideBaptism?.line ?? "?"}
              </Link>
            </div>
          ) : (
            <InfoRow label="Baptismal record" value="Not linked" last />
          )}
        </AdminCard>
      </div>

      <AdminCard className="mb-4 p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
          Marriage Information
        </h2>
        <InfoRow label="Date of marriage" value={formatRecordDate(record.dateOfMarriage)} />
        <InfoRow label="Place of marriage" value={record.placeOfMarriage} />
        <InfoRow label="Minister" value={record.minister} />
        <InfoRow label="Register reference" value={marriageRecordRef(record)} last />
      </AdminCard>

      <AdminCard className="mb-4 p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
          Witnesses
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[record.witnessOne, record.witnessTwo].map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="flex items-center justify-between gap-2.5 rounded-[9px] border border-admin-border bg-admin-surface-alt px-3.5 py-2.5"
            >
              <span className="text-[13.5px] font-semibold text-admin-ink">{name}</span>
              <span className="inline-flex items-center rounded-full bg-admin-gold-100 px-2.5 py-1 text-[11px] font-semibold text-admin-gold-700">
                Witness {i + 1}
              </span>
            </div>
          ))}
        </div>
      </AdminCard>

      {record.remarks && (
        <AdminCard className="mb-4 p-5 px-[22px]">
          <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Remarks
          </h2>
          <p className="text-[13.5px] leading-relaxed text-admin-ink">{record.remarks}</p>
        </AdminCard>
      )}

      <AdminCard className="mb-4 p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
          Record metadata
        </h2>
        <InfoRow label="Encoded by" value={encodedByLabel(record.encodedBy)} />
        <InfoRow label="Created" value={formatDateTime(record.createdAt)} />
        <InfoRow label="Last updated" value={formatDateTime(record.updatedAt)} last />
      </AdminCard>

      <AdminCard className="p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
          Issued Certificates{certs.length ? ` (${certs.length})` : ""}
        </h2>

        {certs.length === 0 ? (
          <p className="text-[11.5px] text-admin-ink-faint">
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
                <AdminButton
                  variant="secondary"
                  size="sm"
                  onClick={() => console.info("[mock] verify", c.code)}
                >
                  <ScanIcon />
                  Verify
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  size="sm"
                  onClick={() => console.info("[mock] download", c.code)}
                >
                  <DownloadIcon />
                  Download
                </AdminButton>
              </div>
            </div>
          ))
        )}
      </AdminCard>
    </div>
  );
}

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-admin-ink-muted hover:text-admin-green-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-[10.5px] ${
        last ? "" : "border-b border-admin-border"
      }`}
    >
      <span className="shrink-0 text-xs text-admin-ink-muted">{label}</span>
      <span className="text-right text-[13.5px] font-semibold text-admin-ink">{value}</span>
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

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 3 14 8 19 8" strokeLinejoin="round" />
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
