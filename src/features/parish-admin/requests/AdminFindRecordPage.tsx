import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import {
  getAdminRequest,
  linkRequestToRecord,
  rejectAdminRequest,
} from "@/features/parish-admin/requests/api/requestsAdminApi";
import { listBaptismalRecords } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { BaptismalRecord } from "@/features/parish-admin/records/types";
import type { Parish, SacramentType } from "@/types";

const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Baptismal",
  confirmation: "Confirmation",
  marriage: "Marriage",
  death: "Death",
};

interface MatchFilters {
  name: string;
  baptismDate: string;
  birthdate: string;
  birthplace: string;
  mother: string;
  father: string;
  sponsor1: string;
  sponsor2: string;
}

// A few extra ledger-only fields the mock shows in the review modal
// (officiating priest, register line) that aren't part of the core
// BaptismalRecord contract everywhere yet.
type LedgerRecord = BaptismalRecord & { line?: string; priest?: string };

type MatchState = "match" | "partial" | "miss" | "none";
type RequestStatus = "pending" | "confirmed" | "rejected";

function norm(s: string | undefined) {
  return (s || "").toLowerCase().trim().replace(/[.,]/g, "");
}

function searchRecords(records: BaptismalRecord[], f: MatchFilters) {
  return records.filter((rec) => {
    const full = recordFullName(rec);
    const mother = recordMotherName(rec);
    const father = recordFatherName(rec);
    if (norm(f.name) && !norm(full).includes(norm(f.name))) return false;
    if (norm(f.birthplace) && !norm(rec.birthplace).includes(norm(f.birthplace))) return false;
    if (norm(f.mother) && !norm(mother).includes(norm(f.mother))) return false;
    if (norm(f.father) && !norm(father).includes(norm(f.father))) return false;
    if (norm(f.birthdate) && !norm(rec.dob).includes(norm(f.birthdate))) return false;
    if (norm(f.baptismDate) && !norm(rec.baptismDate).includes(norm(f.baptismDate))) return false;
    if (norm(f.sponsor1) && !norm(rec.sponsor1).includes(norm(f.sponsor1))) return false;
    if (norm(f.sponsor2) && !norm(rec.sponsor2).includes(norm(f.sponsor2))) return false;
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
  birthplace: "",
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

  const [filters, setFilters] = useState<MatchFilters>(emptyFilters);
  const [results, setResults] = useState<LedgerRecord[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [reviewRecord, setReviewRecord] = useState<LedgerRecord | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [status, setStatus] = useState<RequestStatus>("pending");
  const [confirmedRecord, setConfirmedRecord] = useState<LedgerRecord | null>(null);
  const [rejectedNote, setRejectedNote] = useState("");

  // Wait until BOTH request and records are loaded before the first search.
  // Otherwise we search an empty list, set seeded=true, and never retry.
  // Sponsors are left blank on purpose — parishioner-submitted names often
  // don't match the register exactly (e.g. "Carmela" vs "Carmen").
  useEffect(() => {
    if (!request || recordsLoading || seeded) return;
    const details = request.details;
    const initial: MatchFilters = {
      name: details?.subjectName ?? "",
      baptismDate: details?.baptismDate ?? "",
      birthdate: details?.birthdate ?? "",
      birthplace: details?.birthplace ?? "",
      mother: details?.motherName ?? "",
      father: details?.fatherName ?? "",
      sponsor1: "",
      sponsor2: "",
    };
    setFilters(initial);
    setResults(searchRecords(parishRecords, initial));
    setSeeded(true);
  }, [request, parishRecords, recordsLoading, seeded]);

  if (requestLoading || (request && recordsLoading && !seeded)) {
    return (
      <div className="p-6">
        <BackLink />
        <p className="text-[13.5px] text-admin-ink-muted">Loading request…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <BackLink />
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Request not found</h1>
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
    setResults(searchRecords(parishRecords, filters));
  }

  async function handleLink(record: LedgerRecord) {
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

  const columns: AdminTableColumn<LedgerRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page",
      render: (r) => <span className="font-medium text-admin-ink">{`${r.book}:${r.page}`}</span>,
    },
    { key: "name", header: "Name", render: (r) => recordFullName(r) },
    { key: "baptismDate", header: "Bapt Date", render: (r) => r.baptismDate },
    { key: "dob", header: "Birthdate", render: (r) => r.dob },
    { key: "mother", header: "Mother", render: (r) => recordMotherName(r) },
    { key: "father", header: "Father", render: (r) => recordFatherName(r) },
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
    <div className="p-6">
      <BackLink />

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Record Matching</h1>
          <p className="text-[13.5px] text-admin-ink-muted">
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
          <b className="font-serif text-[14px] font-semibold">
            Record confirmed — {confirmedRecord.book}:{confirmedRecord.page}
          </b>
          <div className="mt-0.5 text-[12.5px] opacity-90">
            {recordFullName(confirmedRecord)} matched to this request. The certificate can now be
            issued from the confirmed ledger entry.
          </div>
        </StatusBanner>
      )}
      {status === "rejected" && (
        <StatusBanner tone="rejected">
          <b className="font-serif text-[14px] font-semibold">Request rejected — no matching record found</b>
          <div className="mt-0.5 text-[12.5px] opacity-90">{rejectedNote || "No note was added."}</div>
        </StatusBanner>
      )}

      <div className={closed ? "pointer-events-none opacity-45 grayscale-[0.3]" : undefined}>
        {/* Request on file + Search ledger — equal width, equal height, compact */}
        <div className="mb-4 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          <AdminCard className="flex h-full flex-col p-4 px-[18px]">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Request on file
              </h2>
              <span className="rounded-full border border-admin-gold-700/30 bg-admin-gold-700/10 px-2 py-0.5 font-mono text-[11px] text-admin-gold-700">
                {request.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4">
              <InfoRow label="Requester's name" value={currentRequest.requesterId || "—"} compact />
              <InfoRow
                label="Certificate type &amp; purpose"
                value={`${sacramentLabels[request.sacramentType]} Certificate`}
                sub={request.purpose}
                compact
                last
              />
            </div>

            <div className="mt-2.5 border-t-2 border-admin-gold-700/40 pt-1.5 font-serif text-[12px] italic text-admin-gold-700">
              Person to be certified
            </div>

            <div className="grid grid-cols-2 gap-x-4">
              <InfoRow label="Name of baptized" value={details?.subjectName || "—"} compact />
              <InfoRow
                label="Baptismal date"
                value={details?.baptismDate || "Not stated"}
                muted={!details?.baptismDate}
                compact
              />
              <InfoRow label="Birthdate" value={details?.birthdate || "—"} compact />
              <InfoRow label="Birthplace" value={details?.birthplace || "—"} compact />
              <InfoRow label="Mother's name" value={details?.motherName || "—"} compact />
              <InfoRow label="Father's name" value={details?.fatherName || "—"} compact />
              <InfoRow label="Sponsor 1" value={details?.sponsor1 || "—"} compact />
              <InfoRow label="Sponsor 2" value={details?.sponsor2 || "—"} compact last />
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
          </AdminCard>

          <AdminCard className="flex h-full flex-col p-4 px-[18px]">
            <div className="mb-1.5 flex items-baseline justify-between">
              <h2 className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Search the baptismal ledger
              </h2>
              <span className="text-[10px] uppercase tracking-[0.5px] text-admin-ink-muted">Editable</span>
            </div>

            <div className="grid grid-cols-2 gap-x-2.5 gap-y-0">
              <AdminField label="Name of baptized">
                <AdminInput value={filters.name} onChange={(e) => setFilter("name", e.target.value)} />
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
                  value={filters.birthdate}
                  onChange={(e) => setFilter("birthdate", e.target.value)}
                />
              </AdminField>
              <AdminField label="Birthplace">
                <AdminInput
                  value={filters.birthplace}
                  onChange={(e) => setFilter("birthplace", e.target.value)}
                />
              </AdminField>
              <AdminField label="Mother's name">
                <AdminInput value={filters.mother} onChange={(e) => setFilter("mother", e.target.value)} />
              </AdminField>
              <AdminField label="Father's name">
                <AdminInput value={filters.father} onChange={(e) => setFilter("father", e.target.value)} />
              </AdminField>
              <AdminField label="Sponsor 1">
                <AdminInput
                  value={filters.sponsor1}
                  onChange={(e) => setFilter("sponsor1", e.target.value)}
                />
              </AdminField>
              <AdminField label="Sponsor 2">
                <AdminInput
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
              <p className="text-[11px] leading-snug text-admin-ink-muted">
                Pre-filled from the request — narrow or clear a field before searching.
              </p>
            </div>
          </AdminCard>
        </div>

        {/* Results — full width, stays compact and in view; badge makes the outcome obvious at a glance */}
        <AdminCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
            <h2 className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
              Candidate records
            </h2>
            <ResultBadge count={results.length} />
          </div>
          <AdminTable
            columns={columns}
            rows={results}
            getRowKey={(r) => r.id}
            emptyMessage="No matching entry found. Try loosening a field — a maiden name, spelling, or exact date can differ from the request — or reject the request if the entry genuinely can't be located."
          />
        </AdminCard>
      </div>

      {reviewRecord && (
        <ReviewMatchModal
          requestName={subjectName}
          requestBirthdate={details?.birthdate}
          requestBirthplace={details?.birthplace}
          requestMother={details?.motherName}
          requestFather={details?.fatherName}
          requestSponsor1={details?.sponsor1}
          requestSponsor2={details?.sponsor2}
          record={reviewRecord}
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
  record: LedgerRecord;
  onClose: () => void;
  onLink: () => void;
}) {
  const fields: [string, string | undefined, string][] = [
    ["Name of baptized", requestName, recordFullName(record)],
    ["Birthdate", requestBirthdate, record.dob],
    ["Birthplace", requestBirthplace, record.birthplace],
    ["Mother's name", requestMother, recordMotherName(record)],
    ["Father's name", requestFather, recordFatherName(record)],
    ["Sponsor 1", requestSponsor1, record.sponsor1],
    ["Sponsor 2", requestSponsor2, record.sponsor2],
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
            <h3 className="font-serif text-lg font-semibold text-admin-ink">Review candidate record</h3>
            <p className="mt-0.5 text-[12.5px] text-admin-ink-muted">
              {record.book}:{record.page}
              {record.line ? `, line ${record.line}` : ""}
            </p>
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
          <span className="rounded-full bg-admin-ink px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.6px] text-admin-surface">
            Request
          </span>
          <span className="rounded-full border border-admin-gold-700/30 bg-admin-gold-700/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.6px] text-admin-gold-700">
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
                <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.4px] text-admin-ink-muted">
                  {label}
                </div>
                <div className="text-[13.5px] text-admin-ink">
                  {left || <span className="italic text-admin-ink-muted">—</span>}
                </div>
              </div>
              <MatchIcon state={states[i]} />
              <div className="text-[13.5px] text-admin-ink">
                {right || <span className="italic text-admin-ink-muted">—</span>}
              </div>
            </div>
          ))}

          <div
            className={`mt-4 rounded-[var(--radius)] border px-3.5 py-2.5 text-[12.5px] ${
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
              <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.4px] text-admin-ink-muted">
                Baptismal date
              </div>
              <div className="text-[13px] text-admin-ink">
                {record.baptismDate}{" "}
                <span className="text-[11.5px] text-admin-ink-muted">(not stated in request)</span>
              </div>
            </div>
            {record.priest && (
              <div>
                <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.4px] text-admin-ink-muted">
                  Officiating priest
                </div>
                <div className="text-[13px] text-admin-ink">{record.priest}</div>
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
          <h3 className="font-serif text-lg font-semibold text-admin-ink">Reject this request</h3>
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
          <p className="mb-3 text-[13px] text-admin-ink-muted">
            Use this when no matching entry can be found in the baptismal ledger. The requester will be
            notified that their certificate could not be issued.
          </p>
          <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Note for the record (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Searched Books 09, 14 and 21 for 1993–1995; no entry matches the details submitted."
            className="min-h-[80px] w-full resize-y rounded-[var(--radius)] border border-admin-border bg-admin-surface-alt px-2.5 py-2 text-[13px] text-admin-ink"
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
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.5px] ${styles[status]}`}
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${
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
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-admin-ink-muted hover:text-admin-green-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back to Requests
    </button>
  );
}

function InfoRow({
  label,
  value,
  sub,
  last,
  muted,
  compact,
}: {
  label: string;
  value: string;
  sub?: string;
  last?: boolean;
  muted?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "py-[7px]" : "py-[10.5px]"} ${
        last ? "" : "border-b border-admin-border"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.4px] text-admin-ink-muted">{label}</div>
      <div
        className={`truncate text-[13px] ${
          muted ? "italic text-admin-ink-muted" : "font-semibold text-admin-ink"
        }`}
        title={value}
      >
        {value}
      </div>
      {sub && <div className="truncate text-[11.5px] text-admin-ink-muted">{sub}</div>}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
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