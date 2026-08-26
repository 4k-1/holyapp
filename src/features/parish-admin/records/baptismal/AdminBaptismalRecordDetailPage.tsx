import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, NoteIcon, UserIcon } from "@/features/parish-admin/components/AdminForm";
import {
  RecordDetailBackLink,
  RecordDetailInfoRow,
  RecordDetailSection,
} from "@/features/parish-admin/components/AdminRecordDetailSection";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { DropletIcon } from "@/components/ui/icons/SacramentIcons";
import {
  addBaptismalAnnotation,
  generateBaptismalCertificate,
  getBaptismalRecord,
} from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { AdminAddAnnotationModal } from "@/features/parish-admin/records/baptismal/AdminAddAnnotationModal";
import { useAsync } from "@/hooks/useAsync";
import {
  annotationDotClass,
  annotationTagClass,
  annotationTime,
  certStatusTone,
  formatRecordDate,
  initials,
  linkedRegisterRef,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { RecordAnnotation } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

export function AdminBaptismalRecordDetailPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: record, loading, refetch } = useAsync(() => getBaptismalRecord(parish.id, id), [parish.id, id]);
  const [generating, setGenerating] = useState(false);
  const [addingAnnotation, setAddingAnnotation] = useState(false);

  if (loading) {
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
          This baptismal record is not available for this parish.
        </p>
      </div>
    );
  }

  const name = recordFullName(record);
  const certs = record.certificates;
  const laterAnnotations = [...record.annotations].sort(
    (a, b) => annotationTime(a.date) - annotationTime(b.date)
  );

  async function handleGenerateCertificate() {
    setGenerating(true);
    try {
      await generateBaptismalCertificate(parish.id, record!.id);
      refetch();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[920px]">
      <RecordDetailBackLink />

      <AdminCard className="mb-4 flex flex-wrap items-start justify-between gap-4 p-5 px-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-admin-green-100 font-serif text-admin-group font-bold text-admin-green-700 ring-1 ring-inset ring-admin-green-600/20">
            {initials(name)}
          </div>
          <div>
            <h1 className="mb-1 font-serif text-admin-page font-semibold leading-tight text-admin-ink">{name}</h1>
            <p className="mb-2 text-admin-body text-admin-ink-muted">
              Baptized {formatRecordDate(record.dateOfBaptism)} at {record.placeOfBaptism}
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
              {record.legitimacyStatus && <AdminBadge tone="muted">{record.legitimacyStatus}</AdminBadge>}
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
        <RecordDetailSection tone="blue" icon={<UserIcon className="h-4.5 w-4.5" />} title="Personal Information" className="mb-0">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow label="Full name" value={name} />
            <RecordDetailInfoRow label="Sex" value={record.sex ?? "—"} />
            <RecordDetailInfoRow label="Place of birth" value={record.placeOfBirth ?? "—"} />
            <RecordDetailInfoRow label="Date of birth" value={formatRecordDate(record.dateOfBirth)} />
            <RecordDetailInfoRow label="Address" value={record.address ?? "—"} last />
          </div>
        </RecordDetailSection>

        <RecordDetailSection tone="gold" icon={<DropletIcon className="h-4.5 w-4.5" />} title="Baptismal Information" className="mb-0">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow label="Date of baptism" value={formatRecordDate(record.dateOfBaptism)} />
            <RecordDetailInfoRow label="Place of baptism" value={record.placeOfBaptism} />
            <RecordDetailInfoRow label="Minister" value={record.minister} />
            <RecordDetailInfoRow label="Mother's name" value={recordMotherName(record)} />
            <RecordDetailInfoRow label="Father's name" value={recordFatherName(record)} last />
          </div>
        </RecordDetailSection>
      </div>

      {/*
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <RecordDetailSection tone="green" icon={<FamilyIcon className="h-4.5 w-4.5" />} title="Grandparents" className="mb-0">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow label="Paternal grandfather" value={record.paternalGrandfather} />
            <RecordDetailInfoRow label="Paternal grandmother" value={record.paternalGrandmother} />
            <RecordDetailInfoRow label="Maternal grandfather" value={record.maternalGrandfather} />
            <RecordDetailInfoRow label="Maternal grandmother" value={record.maternalGrandmother} last />
          </div>
        </RecordDetailSection>

        <RecordDetailSection tone="neutral" icon={<ChecklistIcon className="h-4.5 w-4.5" />} title="Supporting Documents" className="mb-0">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow
              label="Marriage certificate"
              value={record.withMarriageCertificate ? "Present" : "Not on file"}
            />
            <RecordDetailInfoRow
              label="Birth certificate"
              value={record.withBirthCertificate ? "Present" : "Not on file"}
              last
            />
            <p className="pt-3 text-admin-label text-admin-ink-faint">
              Encoded by {encodedByLabel(record.encodedBy)} · Updated {formatDateTime(record.updatedAt)}
            </p>
          </div>
        </RecordDetailSection>
      </div>
      */}

      {record.remarks && (
        <RecordDetailSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Remarks">
          <div className="p-5 px-[22px]">
            <p className="text-admin-body leading-relaxed text-admin-ink">{record.remarks}</p>
          </div>
        </RecordDetailSection>
      )}

      <RecordDetailSection
        tone="green"
        icon={<DropletIcon className="h-4.5 w-4.5" />}
        title="Annotation history"
        right={
          <AdminButton variant="secondary" size="sm" onClick={() => setAddingAnnotation(true)}>
            <PlusIcon />
            Add annotation
          </AdminButton>
        }
      >
        <div className="px-[22px] py-5">
          <ol className="relative">
            <TimelineEvent
              category="Baptism"
              tagClass="bg-admin-green-100 text-admin-green-700"
              dotClass="bg-admin-green-700"
              date={formatRecordDate(record.dateOfBaptism)}
              note={`Entered in the baptismal register at ${record.placeOfBaptism}. Minister: ${record.minister}.`}
              last={laterAnnotations.length === 0}
            />
            {laterAnnotations.map((annotation, i) => (
              <TimelineEvent
                key={annotation.id}
                category={annotation.category}
                tagClass={annotationTagClass[annotation.category]}
                dotClass={annotationDotClass[annotation.category]}
                date={annotation.date}
                note={annotation.note}
                by={annotation.by}
                linked={annotation.linked}
                last={i === laterAnnotations.length - 1}
              />
            ))}
          </ol>
          {laterAnnotations.length === 0 && (
            <p className="mt-4 max-w-[58ch] text-admin-support leading-relaxed text-admin-ink-muted">
              No later sacraments noted yet. Confirmation, marriage, and death are recorded here so a baptismal
              certificate can carry them.
            </p>
          )}
        </div>
      </RecordDetailSection>

      <RecordDetailSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Issued certificates" className="mb-0">
        <div className="px-[22px]">
          {certs.length === 0 ? (
            <p className="py-5 text-admin-label text-admin-ink-faint">
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
                  <div className="flex flex-wrap items-center gap-2 text-admin-body font-semibold text-admin-ink">
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

      {addingAnnotation && (
        <AdminAddAnnotationModal
          subjectName={name}
          onClose={() => setAddingAnnotation(false)}
          onSubmit={async (input) => {
            await addBaptismalAnnotation(parish.id, record.id, input);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function TimelineEvent({
  category,
  tagClass,
  dotClass,
  date,
  note,
  by,
  linked,
  last,
}: {
  category: string;
  tagClass: string;
  dotClass: string;
  date: string;
  note: string;
  by?: string;
  linked?: RecordAnnotation["linked"];
  last?: boolean;
}) {
  return (
    <li className="relative pl-6 pb-5 last:pb-0">
      {!last && (
        <span
          className="absolute bottom-0 left-[5px] top-3.5 w-px bg-admin-border-strong"
          aria-hidden="true"
        />
      )}
      <span className={`absolute left-0 top-1.5 z-[1] h-2.5 w-2.5 rounded-full ring-2 ring-admin-surface ${dotClass}`} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={`inline-flex rounded-[5px] px-2 py-0.5 text-admin-label font-bold uppercase tracking-admin-label ${tagClass}`}
          >
            {category}
          </span>
          <time className="text-admin-support text-admin-ink-muted">{date}</time>
        </div>
        <p className="mt-1 max-w-[62ch] text-admin-body leading-relaxed text-admin-ink">{note}</p>
        {linked && (
          <p className="mt-1 font-mono text-admin-label text-admin-ink-muted">
            {linked.category} register · {linkedRegisterRef(linked)}
          </p>
        )}
        {by && <p className="mt-0.5 text-admin-label text-admin-ink-faint">Noted by {by}</p>}
      </div>
    </li>
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
