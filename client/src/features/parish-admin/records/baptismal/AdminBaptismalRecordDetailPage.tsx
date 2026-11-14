import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, FileIcon, NoteIcon, UserIcon } from "@/features/parish-admin/components/AdminForm";
import {
  RecordDetailBackLink,
  RecordDetailInfoRow,
  RecordDetailMeta,
  RecordDetailSection,
} from "@/features/parish-admin/components/AdminRecordDetailSection";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { DropletIcon } from "@/components/ui/icons/SacramentIcons";
import { AdminAddAnnotationModal } from "@/features/parish-admin/records/baptismal/AdminAddAnnotationModal";
import { AdminGenerateCertificateModal } from "@/features/parish-admin/records/AdminGenerateCertificateModal";
import { IssuedCertificatesSection } from "@/features/parish-admin/records/IssuedCertificatesSection";
import { addBaptismalAnnotation, archiveBaptismalRecord, generateBaptismalCertificate, getBaptismalRecord, unarchiveBaptismalRecord } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { AdminArchiveRecordModal } from "@/features/parish-admin/records/AdminArchiveRecordModal";
import { revokeIssuedCertificate } from "@/features/parish-admin/requests/api/requestsAdminApi";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { canEditSacramentalRecords } from "@/features/parish-admin/permissions";
import {
  annotationDotClass,
  annotationTagClass,
  annotationTime,
  baptismCertificateFields,
  encodedByLabel,
  formatDateTime,
  formatRecordDate,
  initials,
  linkedRegisterRef,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { IssuedRecordCertificate, RecordAnnotation } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import { PAGE_TITLE_CLASS, RECORD_DETAIL_WIDTH_CLASS } from "@/features/parish-admin/components/adminPageStyles";
import { askText } from "@/lib/notify";
import { userCan } from "@/features/parish-admin/access";

export function AdminBaptismalRecordDetailPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const canEdit = canEditSacramentalRecords(user?.role);
  const canIssue = userCan(user, "certificates", "manage");
  const id = decodeURIComponent(recordId);

  const { data: record, loading, error, refetch } = useAsync(() => getBaptismalRecord(parish.id, id), [parish.id, id]);
  const [addingAnnotation, setAddingAnnotation] = useState(false);
  const [certificateModal, setCertificateModal] = useState<IssuedRecordCertificate | "new" | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

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
        <h1 className={`mb-1 ${PAGE_TITLE_CLASS}`}>
          {error ? "Could not load record" : "Record not found"}
        </h1>
        <p className="text-admin-body text-admin-ink-muted">
          {error
            ? error.message
            : "This baptismal record is not available for this parish."}
        </p>
      </div>
    );
  }

  const name = recordFullName(record);
  const certs = record.certificates;
  const laterAnnotations = [...record.annotations].sort(
    (a, b) => annotationTime(a.date) - annotationTime(b.date)
  );

  async function handleRevoke(cert: IssuedRecordCertificate) {
    if (!cert.id) return;
    const reason = await askText({
      title: "Revoke this certificate?",
      message: "Anyone who checks it will see it's no longer valid. This can't be undone.",
      label: "Reason for revoking",
      placeholder: "For example: issued with a wrong date",
      confirmLabel: "Revoke certificate",
      danger: true,
    });
    if (!reason) return;
    await revokeIssuedCertificate(cert.id, reason);
    refetch();
  }

  return (
    <div className={RECORD_DETAIL_WIDTH_CLASS}>
      <RecordDetailBackLink />

      <AdminCard className="mb-4 flex flex-wrap items-start justify-between gap-4 p-5 px-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-admin-green-100 font-serif text-admin-group font-bold text-admin-green-700 ring-1 ring-inset ring-admin-green-600/20">
            {initials(name)}
          </div>
          <div>
            <h1 className={`mb-1 ${PAGE_TITLE_CLASS}`}>{name}</h1>
            <p className="mb-2 text-admin-body text-admin-ink-muted">
              Baptized {formatRecordDate(record.dateOfBaptism)}
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
              {record.legitimacyStatus && <AdminBadge tone="muted">{record.legitimacyStatus}</AdminBadge>}
            </div>
            {record.ledgerSource && (
              <Link
                to={`/${parish.slug}/admin/records/ledgers/${encodeURIComponent(record.ledgerSource.bookId)}/pages/${record.ledgerSource.pageNumber}`}
                className="mt-2.5 inline-block text-admin-support font-semibold text-admin-green-700 hover:underline"
              >
                See the register page (row {record.ledgerSource.row}) →
              </Link>
            )}
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
            <RecordDetailInfoRow label="Minister" value={record.minister} />
            <RecordDetailInfoRow label="Mother's name" value={recordMotherName(record) || "Not recorded"} />
            <RecordDetailInfoRow label="Father's name" value={recordFatherName(record) || "Not recorded"} />
            <RecordDetailInfoRow
              label="Godparents"
              value={
                record.godparents?.length
                  ? record.godparents
                      .map((g) => {
                        const n = [g.firstName, g.middleName, g.lastName].filter(Boolean).join(" ");
                        return g.role ? `${n} (${g.role})` : n;
                      })
                      .join(", ")
                  : "Not recorded"
              }
              last
            />
          </div>
        </RecordDetailSection>
      </div>

      {/*
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <RecordDetailSection tone="green" icon={<FamilyIcon className="h-4.5 w-4.5" />} title="Grandparents" className="mb-0">
          <div className="p-5 px-[22px]">
            <RecordDetailInfoRow label="Paternal grandfather" value={record.paternalGrandfather || "—"} />
            <RecordDetailInfoRow label="Paternal grandmother" value={record.paternalGrandmother || "—"} />
            <RecordDetailInfoRow label="Maternal grandfather" value={record.maternalGrandfather || "—"} />
            <RecordDetailInfoRow label="Maternal grandmother" value={record.maternalGrandmother || "—"} last />
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
                date={formatRecordDate(annotation.date)}
                note={annotation.note}
                by={annotation.by}
                source={annotation.source}
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

      <IssuedCertificatesSection
        certificates={certs}
        onView={(c) => setCertificateModal(c)}
        onRevoke={canEdit ? handleRevoke : undefined}
      />

      <RecordDetailMeta
        encodedBy={record.encodedByName ?? encodedByLabel(record.encodedBy)}
        created={formatDateTime(record.createdAt)}
        updated={formatDateTime(record.updatedAt)}
      />

      {addingAnnotation && (
        <AdminAddAnnotationModal
          subjectName={name}
          baptismal={{
            id: record.id,
            firstName: record.firstName,
            middleName: record.middleName,
            lastName: record.lastName,
            sex: record.sex,
            dateOfBirth: record.dateOfBirth,
            address: record.address,
            fatherFirstName: record.fatherFirstName,
            fatherMiddleName: record.fatherMiddleName,
            fatherLastName: record.fatherLastName,
            motherFirstName: record.motherFirstName,
            motherMiddleName: record.motherMiddleName,
            motherLastName: record.motherLastName,
            dateOfBaptism: record.dateOfBaptism,
            placeOfBaptism: record.placeOfBaptism,
          }}
          existingCategories={record.annotations.map((a) => a.category)}
          onClose={() => setAddingAnnotation(false)}
          onRecorded={() => refetch()}
          onSubmit={async (input) => {
            await addBaptismalAnnotation(parish.id, record.id, input);
            refetch();
          }}
        />
      )}

      {archiveOpen && (
        <AdminArchiveRecordModal
          recordName={name}
          registerLabel="baptismal record"
          intent={record.status === "Archived" ? "restore" : "archive"}
          onClose={() => setArchiveOpen(false)}
          onConfirm={() =>
            (record.status === "Archived"
              ? unarchiveBaptismalRecord(parish.id, record.id)
              : archiveBaptismalRecord(parish.id, record.id)
            ).then(() => refetch())
          }
        />
      )}

      {certificateModal && (
        <AdminGenerateCertificateModal
          parish={parish}
          sacramentType="baptism"
          subjectName={name}
          fields={baptismCertificateFields(record)}
          issued={certificateModal === "new" ? undefined : certificateModal}
          onClose={() => setCertificateModal(null)}
          onIssue={(purpose) => generateBaptismalCertificate(parish.id, record.id, purpose)}
          onIssued={(cert) => {
            setCertificateModal(cert);
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
  source,
  linked,
  last,
}: {
  category: string;
  tagClass: string;
  dotClass: string;
  date: string;
  note: string;
  by?: string;
  source?: RecordAnnotation["source"];
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
        {by && (
          <p className="mt-0.5 text-admin-label text-admin-ink-faint">
            {source === "auto" ? "Added automatically" : "Recorded manually"} by {by}
          </p>
        )}
      </div>
    </li>
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
