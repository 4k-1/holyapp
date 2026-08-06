import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import {
  annotationDotClass,
  annotationTagClass,
  certStatusTone,
  initials,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { Parish } from "@/types";

export function AdminBaptismalRecordDetailPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const record = MOCK_BAPTISMAL_RECORDS.find((r) => r.id === id && r.parishId === parish.id);

  if (!record) {
    return (
      <div className="p-6">
        <BackLink to=".." />
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Record not found</h1>
        <p className="text-[13.5px] text-admin-ink-muted">
          This baptismal record is not available for this parish.
        </p>
      </div>
    );
  }

  const name = recordFullName(record);
  const sponsors = [
    { name: record.sponsor1, role: "Ninong" },
    { name: record.sponsor2, role: "Ninang" },
  ].filter((s) => s.name);
  const certs = record.certificates;

  return (
    <div className="p-6">
      <BackLink to=".." />

      {/* Header */}
      <AdminCard className="mb-[18px] flex flex-wrap items-start justify-between gap-4 p-[22px] px-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-admin-green-100 font-serif text-[15px] font-bold text-admin-green-900">
            {initials(name)}
          </div>
          <div>
            <h1 className="mb-2 text-[22px] font-semibold text-admin-ink">{name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-border bg-admin-surface-alt px-2.5 py-1 font-mono text-xs text-admin-ink-muted">
                Book {record.book}
                <span className="text-admin-border-strong">/</span>
                Page {record.page}
                <span className="text-admin-border-strong">/</span>
                Line {record.line || "—"}
              </span>
              <AdminBadge tone={record.status === "Archived" ? "muted" : "green"}>
                {record.status}
              </AdminBadge>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <AdminButton onClick={() => console.info("[mock] generate certificate", record.id)}>
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

      {/* Personal + Baptismal */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminCard className="p-5 px-[22px]">
          <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Personal Information
          </h2>
          <InfoRow label="Full name" value={name} />
          <InfoRow label="Sex" value={record.sex} />
          <InfoRow label="Birthplace" value={record.birthplace} />
          <InfoRow label="Date of birth" value={record.dob} last />
        </AdminCard>

        <AdminCard className="p-5 px-[22px]">
          <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Baptismal Information
          </h2>
          <InfoRow label="Baptismal date" value={record.baptismDate} />
          <InfoRow label="Officiating priest" value={record.priest} />
          <InfoRow label="Mother's name" value={recordMotherName(record)} />
          <InfoRow label="Father's name" value={recordFatherName(record)} last />
        </AdminCard>
      </div>

      {/* Sponsors */}
      <AdminCard className="mb-4 p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
          Sponsors ({sponsors.length})
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {sponsors.map((s) => (
            <div
              key={`${s.role}-${s.name}`}
              className="flex items-center justify-between gap-2.5 rounded-[9px] border border-admin-border bg-admin-surface-alt px-3.5 py-2.5"
            >
              <span className="text-[13.5px] font-semibold text-admin-ink">{s.name}</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  s.role === "Ninong"
                    ? "bg-[#D6EAF8] text-[#3A7CA5]"
                    : "bg-[#F8D6E0] text-[#B85A75]"
                }`}
              >
                {s.role}
              </span>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Annotation history */}
      <AdminCard className="mb-4 p-5 px-[22px]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="m-0 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Annotation History
          </h2>
          <AdminButton
            variant="ghost"
            className="py-0.5"
            onClick={() => console.info("[mock] add annotation", record.id)}
          >
            + Add annotation
          </AdminButton>
        </div>

        {record.annotations.length === 0 ? (
          <p className="text-[11.5px] text-admin-ink-faint">
            No later sacraments have been annotated on this record yet.
          </p>
        ) : (
          record.annotations.map((a, i) => (
            <div key={`${a.category}-${a.date}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
              {i < record.annotations.length - 1 && (
                <span className="absolute bottom-0 left-[5px] top-4 w-px bg-admin-border-strong" />
              )}
              <span
                className={`mt-1 h-[11px] w-[11px] shrink-0 rounded-full ${annotationDotClass[a.category]}`}
              />
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-[5px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.3px] ${annotationTagClass[a.category]}`}
                  >
                    {a.category}
                  </span>
                  <span className="text-xs text-admin-ink-muted">{a.date}</span>
                </div>
                <p className="mb-1 text-[13px] leading-relaxed text-admin-ink">{a.note}</p>
                {a.linked && (
                  <button
                    type="button"
                    className="mb-1 inline-flex items-center gap-1.5 rounded-[7px] border border-admin-green-100 bg-admin-green-050 px-2.5 py-1 text-xs font-semibold text-admin-green-700 hover:bg-admin-green-100"
                    onClick={() => console.info("[mock] open linked record", a.linked)}
                  >
                    <LinkIcon />
                    Linked to {a.linked.category} record — Book {a.linked.book}:{a.linked.page}, Line{" "}
                    {a.linked.line || "—"}
                  </button>
                )}
                <p className="text-xs leading-relaxed text-admin-ink-muted">Entered by: {a.by}</p>
              </div>
            </div>
          ))
        )}
      </AdminCard>

      {/* Issued certificates */}
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

function BackLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-admin-ink-muted hover:text-admin-green-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back to Baptismal Records
    </Link>
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

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" strokeLinecap="round" />
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
