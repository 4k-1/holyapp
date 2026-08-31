import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminButton, AdminField, AdminInput, BookIcon } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailSection } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import {
  getAdminRequest,
  linkRequestToRecord,
  rejectAdminRequest,
} from "@/features/parish-admin/requests/api/requestsAdminApi";
import { listBaptismalRecords } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import {
  listSponsorsBySacrament,
  sponsorFullName,
  type RecordSponsor,
} from "@/features/parish-admin/records/api/sponsorsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  baptismRecordRef,
  formatRecordDate,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { BaptismalRecord } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

interface MatchFilters {
  name: string;
  baptismDate: string;
  birthdate: string;
  placeOfBirth: string;
  mother: string;
  father: string;
  sponsor1: string;
  sponsor2: string;
}

type MatchState = "match" | "partial" | "miss" | "none";
type RequestStatus = "pending" | "confirmed" | "rejected";

function norm(s: string | undefined) {
  return (s || "").toLowerCase().trim().replace(/[.,]/g, "");
}

// Requests store dates as human-readable text (e.g. "January 18, 2005", copied
// from the parishioner's submitted details) while ledger records store ISO
// dates (e.g. "2005-01-18"). Compare a search field against both the raw
// ISO value and its formatted display so a search doesn't miss an otherwise
// exact match just because the two sides spell the date differently.
function dateFieldMatches(filterValue: string, isoDate: string) {
  const target = norm(filterValue);
  if (!target) return true;
  return norm(isoDate).includes(target) || norm(formatRecordDate(isoDate)).includes(target);
}

// A record's sponsors aren't strictly "Sponsor 1" / "Sponsor 2" on the ledger
// side (assignment order isn't guaranteed) — so each filled search field just
// needs to match *some* sponsor on the record, not a fixed positional slot.
function sponsorFieldMatches(filterValue: string, sponsorNames: string[]) {
  const target = norm(filterValue);
  if (!target) return true;
  return sponsorNames.some((name) => norm(name).includes(target));
}

function searchRecords(
  records: BaptismalRecord[],
  f: MatchFilters,
  sponsorsByRecordId: Record<string, RecordSponsor[]>
) {
  return records.filter((rec) => {
    const full = recordFullName(rec);
    const mother = recordMotherName(rec);
    const father = recordFatherName(rec);
    const sponsorNames = (sponsorsByRecordId[rec.id] ?? []).map(sponsorFullName);
    if (norm(f.name) && !norm(full).includes(norm(f.name))) return false;
    if (norm(f.placeOfBirth) && !norm(rec.placeOfBirth).includes(norm(f.placeOfBirth))) return false;
    if (norm(f.mother) && !norm(mother).includes(norm(f.mother))) return false;
    if (norm(f.father) && !norm(father).includes(norm(f.father))) return false;
    if (!dateFieldMatches(f.birthdate, rec.dateOfBirth)) return false;
    if (!dateFieldMatches(f.baptismDate, rec.dateOfBaptism)) return false;
    if (!sponsorFieldMatches(f.sponsor1, sponsorNames)) return false;
    if (!sponsorFieldMatches(f.sponsor2, sponsorNames)) return false;
    return true;
  });
}

// Word-overlap comparison, not strict equality — a maiden-name order swap
// or a dropped middle name shouldn't read as a flat mismatch in the modal.
function wordOverlap(a: string | undefined, b: string | undefined) {
  const wa = new Set(norm(a).split(/\s+/).filter(Boolean));
  const wb = new Set(norm(b).split(/\s+/).filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  wa.forEach((w) => {
    if (wb.has(w)) shared++;
  });
  return shared / Math.max(wa.size, wb.size);
}

function matchState(a: string | undefined, b: string | undefined): MatchState {
  if (!a) return "none";
  const ratio = wordOverlap(a, b);
  if (ratio === 1) return "match";
  if (ratio > 0) return "partial";
  return "miss";
}

const emptyFilters: MatchFilters = {
  name: "",
  baptismDate: "",
  birthdate: "",
  placeOfBirth: "",
  mother: "",
  father: "",
  sponsor1: "",
  sponsor2: "",
};

export function AdminFindRecordPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { requestId = "" } = useParams();
  const navigate = useNavigate();

  const { data: request, loading: requestLoading } = useAsync(
    () => getAdminRequest(parish.id, requestId),
    [parish.id, requestId]
  );
  const { data: parishRecords = [], loading: recordsLoading } = useAsync(
    () => listBaptismalRecords(parish.id),
    [parish.id]
  );
  const { data: sponsorsByRecordId = {}, loading: sponsorsLoading } = useAsync(
    () => listSponsorsBySacrament("baptism"),
    []
  );

  const [filters, setFilters] = useState<MatchFilters>(emptyFilters);
  const [results, setResults] = useState<BaptismalRecord[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [reviewRecord, setReviewRecord] = useState<BaptismalRecord | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [status, setStatus] = useState<RequestStatus>("pending");
  const [confirmedRecord, setConfirmedRecord] = useState<BaptismalRecord | null>(null);
  const [rejectedNote, setRejectedNote] = useState("");

  // Wait until request, records, AND sponsor assignments are loaded before
  // the first search. Otherwise we search an incomplete list, set
  // seeded=true, and never retry.
  useEffect(() => {
    if (!request || recordsLoading || sponsorsLoading || seeded) return;
    const details = request.details;
    const initial: MatchFilters = {
      name: details?.subjectName ?? "",
      baptismDate: details?.baptismDate ?? "",
      birthdate: details?.birthdate ?? "",
      placeOfBirth: details?.birthplace ?? "",
      mother: details?.motherName ?? "",
      father: details?.fatherName ?? "",
      sponsor1: details?.sponsor1 ?? "",
      sponsor2: details?.sponsor2 ?? "",
    };
    setFilters(initial);
    setResults(searchRecords(parishRecords, initial, sponsorsByRecordId));
    setSeeded(true);
  }, [request, parishRecords, recordsLoading, sponsorsByRecordId, sponsorsLoading, seeded]);

  if (requestLoading || (request && (recordsLoading || sponsorsLoading) && !seeded)) {
    return (
      <div>
        <BackLink />
        <p className="text-admin-body text-admin-ink-muted">Loading request…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div>
        <BackLink />
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Request not found</h1>
      </div>
    );
  }

  const currentRequest = request; // narrowed, stable reference for the closures below
  const details = currentRequest.details;
  const subjectName = details?.subjectName ?? currentRequest.requesterId;
  const closed = status !== "pending";

  function setFilter<K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function runSearch() {
    setResults(searchRecords(parishRecords, filters, sponsorsByRecordId));
  }

  async function handleLink(record: BaptismalRecord) {
    await linkRequestToRecord(currentRequest.id, record.id);
    setReviewRecord(null);
    setConfirmedRecord(record);
    setStatus("confirmed");
  }

  async function handleReject() {
    const note = rejectReason.trim();
    await rejectAdminRequest(
      currentRequest.id,
      note || "No matching baptismal record found in parish register."
    );
    setRejectedNote(note);
    setRejectOpen(false);
    setStatus("rejected");
  }

  const columns: AdminTableColumn<BaptismalRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      render: (r) => <span className="font-medium text-admin-ink">{baptismRecordRef(r)}</span>,
    },
    { key: "name", header: "Name", render: (r) => recordFullName(r) },
    {
      key: "dateOfBaptism",
      header: "Bapt Date",
      render: (r) => formatRecordDate(r.dateOfBaptism),
    },
    {
      key: "dateOfBirth",
      header: "Birthdate",
      render: (r) => formatRecordDate(r.dateOfBirth),
    },
    { key: "mother", header: "Mother", render: (r) => recordMotherName(r) },
    { key: "father", header: "Father", render: (r) => recordFatherName(r) },
    {
      key: "sponsors",
      header: "Sponsors",
      render: (r) => (sponsorsByRecordId[r.id] ?? []).map(sponsorFullName).join(", ") || "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <button
          type="button"
          onClick={() => setReviewRecord(r)}
          disabled={closed}
          className="font-semibold text-admin-green-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
        >
          Review match
        </button>
      ),
    },
  ];

  return (
    <div>
      <BackLink />

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Record Matching</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Request {request.id} · {subjectName}
          </p>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <StatusPill status={status} />
          <AdminButton variant="danger" size="sm" onClick={() => setRejectOpen(true)} disabled={closed}>
            Reject request
          </AdminButton>
        </div>
      </div>

      {status === "confirmed" && confirmedRecord && (
        <StatusBanner tone="confirmed">
          <b className="font-serif text-admin-body font-semibold">
            Record confirmed — {baptismRecordRef(confirmedRecord)}
          </b>
          <div className="mt-0.5 text-admin-support opacity-90">
            {recordFullName(confirmedRecord)} matched to this request. The certificate can now be
            issued from the confirmed ledger entry.
          </div>
        </StatusBanner>
      )}
      {status === "rejected" && (
        <StatusBanner tone="rejected">
          <b className="font-serif text-admin-body font-semibold">Request rejected — no matching record found</b>
          <div className="mt-0.5 text-admin-support opacity-90">{rejectedNote || "No note was added."}</div>
        </StatusBanner>
      )}

      <div className={closed ? "pointer-events-none opacity-45 grayscale-[0.3]" : undefined}>
        {/* Request on file + Search ledger — equal width, equal height, compact */}
        <div className="mb-4 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          <RecordDetailSection
            tone="gold"
            icon={<FileIcon className="h-4 w-4" />}
            title="Request on file"
            right={
              <span className="rounded-full border border-admin-gold-700/30 bg-admin-gold-700/10 px-2 py-0.5 font-mono text-admin-label text-admin-gold-700">
                {request.id}
              </span>
            }
            className="mb-0 flex h-full flex-col"
          >
            <div className="flex flex-1 flex-col p-4 px-5">
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-0">
                <ReadOnlyField label="Name of baptized" value={details?.subjectName || "—"} />
                <ReadOnlyField
                  label="Baptismal date"
                  value={details?.baptismDate || "Not stated"}
                  muted={!details?.baptismDate}
                />
                <ReadOnlyField label="Birthdate" value={details?.birthdate || "—"} />
                <ReadOnlyField label="Place of birth" value={details?.birthplace || "—"} />
                <ReadOnlyField label="Mother's name" value={details?.motherName || "—"} />
                <ReadOnlyField label="Father's name" value={details?.fatherName || "—"} />
                <ReadOnlyField label="Sponsor 1" value={details?.sponsor1 || "—"} />
                <ReadOnlyField label="Sponsor 2" value={details?.sponsor2 || "—"} />
              </div>

              <div className="mt-auto pt-2.5">
                <AdminButton
                  variant="secondary"
                  size="sm"
                  onClick={() => console.info("[mock] view supporting docs", request.id)}
                >
                  <FileIcon />
                  View Supporting Docs
                </AdminButton>
              </div>
            </div>
          </RecordDetailSection>

          <RecordDetailSection
            tone="blue"
            icon={<SearchIcon className="h-4 w-4" />}
            title="Search the baptismal ledger"
            right={
              <span className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                Editable
              </span>
            }
            className="mb-0 flex h-full flex-col"
          >
            <div className="flex flex-1 flex-col p-4 px-5">
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-0">
                <AdminField label="Name of baptized">
                  <AdminInput
                    placeholder="Juan Dela Cruz"
                    value={filters.name}
                    onChange={(e) => setFilter("name", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Baptismal date">
                  <AdminInput
                    placeholder="If known"
                    value={filters.baptismDate}
                    onChange={(e) => setFilter("baptismDate", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Birthdate">
                  <AdminInput
                    placeholder="January 18, 2005"
                    value={filters.birthdate}
                    onChange={(e) => setFilter("birthdate", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Place of birth">
                  <AdminInput
                    placeholder="Manila, Metro Manila"
                    value={filters.placeOfBirth}
                    onChange={(e) => setFilter("placeOfBirth", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Mother's name">
                  <AdminInput
                    placeholder="Maria Santos"
                    value={filters.mother}
                    onChange={(e) => setFilter("mother", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Father's name">
                  <AdminInput
                    placeholder="Jose Reyes"
                    value={filters.father}
                    onChange={(e) => setFilter("father", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Sponsor 1">
                  <AdminInput
                    placeholder="Juanita Alfonso"
                    value={filters.sponsor1}
                    onChange={(e) => setFilter("sponsor1", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Sponsor 2">
                  <AdminInput
                    placeholder="Emilio Javier"
                    value={filters.sponsor2}
                    onChange={(e) => setFilter("sponsor2", e.target.value)}
                  />
                </AdminField>
              </div>

              <div className="mt-auto flex items-center gap-3 border-t border-admin-border pt-2.5">
                <AdminButton onClick={runSearch}>
                  <SearchIcon />
                  Search ledger
                </AdminButton>
                <p className="text-admin-label leading-snug text-admin-ink-muted">
                  Pre-filled from the request — narrow or clear a field before searching.
                </p>
              </div>
            </div>
          </RecordDetailSection>
        </div>

        <RecordDetailSection
          tone="green"
          icon={<BookIcon className="h-4 w-4" />}
          title="Candidate records"
          right={<ResultBadge count={results.length} />}
          className="mb-0 overflow-hidden"
        >
          <AdminTable
            columns={columns}
            rows={results}
            getRowKey={(r) => r.id}
            emptyMessage="No matching entry found. Try loosening a field — a maiden name, spelling, or exact date can differ from the request — or reject the request if the entry genuinely can't be located."
          />
        </RecordDetailSection>
      </div>

      {reviewRecord && (
        <ReviewMatchModal
          requestName={filters.name}
          requestBirthdate={filters.birthdate}
          requestBirthplace={filters.placeOfBirth}
          requestMother={filters.mother}
          requestFather={filters.father}
          requestSponsor1={filters.sponsor1}
          requestSponsor2={filters.sponsor2}
          record={reviewRecord}
          recordSponsors={sponsorsByRecordId[reviewRecord.id] ?? []}
          onClose={() => setReviewRecord(null)}
          onLink={() => handleLink(reviewRecord)}
        />
      )}

      {rejectOpen && (
        <RejectModal
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onCancel={() => setRejectOpen(false)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}

function ReviewMatchModal({
  requestName,
  requestBirthdate,
  requestBirthplace,
  requestMother,
  requestFather,
  requestSponsor1,
  requestSponsor2,
  record,
  recordSponsors,
  onClose,
  onLink,
}: {
  requestName: string;
  requestBirthdate?: string;
  requestBirthplace?: string;
  requestMother?: string;
  requestFather?: string;
  requestSponsor1?: string;
  requestSponsor2?: string;
  record: BaptismalRecord;
  recordSponsors: RecordSponsor[];
  onClose: () => void;
  onLink: () => void;
}) {
  // Ledger sponsors aren't stored as "Sponsor 1" / "Sponsor 2" slots — the
  // primary assignment (e.g. Ninang) sorts first, so pair it against
  // whichever request field is filled first for a sensible side-by-side.
  const fields: [string, string | undefined, string][] = [
    ["Name of baptized", requestName, recordFullName(record)],
    ["Birthdate", requestBirthdate, formatRecordDate(record.dateOfBirth)],
    ["Place of birth", requestBirthplace, record.placeOfBirth ?? ""],
    ["Mother's name", requestMother, recordMotherName(record)],
    ["Father's name", requestFather, recordFatherName(record)],
    ["Sponsor 1", requestSponsor1, recordSponsors[0] ? sponsorFullName(recordSponsors[0]) : ""],
    ["Sponsor 2", requestSponsor2, recordSponsors[1] ? sponsorFullName(recordSponsors[1]) : ""],
  ];
  const states = fields.map(([, left, right]) => matchState(left, right));
  const matches = states.filter((s) => s === "match").length;
  const partials = states.filter((s) => s === "partial").length;
  const misses = states.filter((s) => s === "miss").length;

  const strongMatch = misses === 0 && partials === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
          <div>
            <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Review candidate record</h3>
            <p className="mt-0.5 text-admin-support text-admin-ink-muted">{baptismRecordRef(record)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          <span className="rounded-full bg-admin-ink px-2.5 py-1 text-admin-label font-bold uppercase tracking-admin-label text-admin-surface">
            Request
          </span>
          <span className="rounded-full border border-admin-gold-700/30 bg-admin-gold-700/10 px-2.5 py-1 text-admin-label font-bold uppercase tracking-admin-label text-admin-gold-700">
            Ledger record
          </span>
        </div>

        <div className="overflow-y-auto px-6 py-[14px]">
          {fields.map(([label, left, right], i) => (
            <div
              key={label}
              className="grid grid-cols-[1fr_20px_1fr] items-start gap-2.5 border-b border-admin-border py-2.5 last:border-b-0"
            >
              <div>
                <div className="mb-0.5 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                  {label}
                </div>
                <div className="text-admin-body text-admin-ink">
                  {left || <span className="italic text-admin-ink-muted">—</span>}
                </div>
              </div>
              <MatchIcon state={states[i]} />
              <div className="text-admin-body text-admin-ink">
                {right || <span className="italic text-admin-ink-muted">—</span>}
              </div>
            </div>
          ))}

          <div
            className={`mt-4 rounded-[var(--radius)] border px-3.5 py-2.5 text-admin-support ${
              strongMatch
                ? "border-admin-green-700/30 bg-admin-green-100 text-admin-green-900"
                : "border-admin-gold-700/30 bg-admin-gold-700/10 text-admin-gold-700"
            }`}
          >
            {strongMatch ? (
              <>
                <strong>
                  {matches} of {states.length} fields match exactly.
                </strong>{" "}
                Strong candidate.
              </>
            ) : misses === 0 ? (
              <>
                {matches} exact, {partials} similar, 0 mismatched — likely the same entry with minor
                recording differences.
              </>
            ) : (
              <>
                {matches} exact, {partials} similar, <strong>{misses} mismatched</strong> — review
                carefully before confirming.
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2 border-t border-dashed border-admin-border pt-3.5 sm:grid-cols-2">
            <div>
              <div className="mb-0.5 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                Baptismal date
              </div>
              <div className="text-admin-body text-admin-ink">
                {formatRecordDate(record.dateOfBaptism)}{" "}
                <span className="text-admin-label text-admin-ink-muted">(not stated in request)</span>
              </div>
            </div>
            {record.minister && (
              <div>
                <div className="mb-0.5 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                  Minister
                </div>
                <div className="text-admin-body text-admin-ink">{record.minister}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose}>
            Back to results
          </AdminButton>
          <AdminButton onClick={onLink}>
            <LinkIcon />
            Confirm this record
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-[460px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Reject this request</h3>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="mb-3 text-admin-body text-admin-ink-muted">
            Use this when no matching entry can be found in the baptismal ledger. The requester will be
            notified that their certificate could not be issued.
          </p>
          <label className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
            Note for the record (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Searched Books 09, 14 and 21 for 1993–1995; no entry matches the details submitted."
            className="min-h-[80px] w-full resize-y rounded-[var(--radius)] border border-admin-border bg-admin-surface-alt px-2.5 py-2 text-admin-body text-admin-ink"
          />
        </div>
        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" onClick={onConfirm}>
            Reject request
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, string> = {
    pending: "border-admin-gold-700/40 bg-admin-gold-700/10 text-admin-gold-700",
    confirmed: "border-admin-green-700/40 bg-admin-green-100 text-admin-green-900",
    rejected: "border-red-300 bg-red-50 text-red-700",
  };
  const labels: Record<RequestStatus, string> = {
    pending: "Pending verification",
    confirmed: "Match confirmed",
    rejected: "Rejected",
  };
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-admin-label font-semibold uppercase tracking-admin-label ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function StatusBanner({ tone, children }: { tone: "confirmed" | "rejected"; children: ReactNode }) {
  const styles =
    tone === "confirmed"
      ? "border-admin-green-700/30 bg-admin-green-100 text-admin-green-900"
      : "border-red-300 bg-red-50 text-red-700";
  return (
    <div className={`mb-4 flex items-start gap-2.5 rounded-[var(--radius)] border px-4 py-3 ${styles}`}>
      {tone === "confirmed" ? <CheckIcon /> : <XIcon />}
      <div>{children}</div>
    </div>
  );
}

// Color-coded so the outcome of a search reads instantly, before anyone
// scans the table rows: green = candidates found, amber = none yet.
function ResultBadge({ count }: { count: number }) {
  const hasResults = count > 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-admin-support font-semibold ${
        hasResults
          ? "border-admin-green-700/30 bg-admin-green-100 text-admin-green-900"
          : "border-admin-gold-700/30 bg-admin-gold-700/10 text-admin-gold-700"
      }`}
    >
      <span className="font-mono">{count}</span>
      {count === 1 ? "record matched" : "records matched"}
    </span>
  );
}

function MatchIcon({ state }: { state: MatchState }) {
  if (state === "match") return <CheckIcon className="mt-0.5 justify-self-center text-admin-green-700" />;
  if (state === "partial")
    return (
      <span className="mt-1.5 flex justify-self-center">
        <span className="h-2.5 w-2.5 rounded-full bg-admin-gold-700" />
      </span>
    );
  if (state === "miss") return <XIcon className="mt-0.5 justify-self-center text-red-600" />;
  return <span />;
}

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-3.5 inline-flex items-center gap-1.5 text-admin-body text-admin-ink-muted hover:text-admin-green-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back to Requests
    </button>
  );
}

// Same label + box dimensions as AdminField/AdminInput on the search card,
// so each row on this read-only side lines up exactly with its counterpart
// on the right — same height, same vertical position, easy to eyeball across.
function ReadOnlyField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
        {label}
      </label>
      <div
        className={`w-full truncate rounded-[7px] border border-admin-border bg-admin-surface-alt px-[11px] py-[9px] text-admin-body ${
          muted ? "italic text-admin-ink-muted" : "font-semibold text-admin-ink"
        }`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function SearchIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 3 14 8 19 8" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      className={`h-[17px] w-[17px] ${className}`}
    >
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      className={`h-[15px] w-[15px] ${className}`}
    >
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}