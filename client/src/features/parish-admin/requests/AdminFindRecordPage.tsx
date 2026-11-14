import { formatTableDate } from "@/lib/dates";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
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
import { recordDetailPath } from "@/features/parish-admin/records/recordPaths";
import type { BaptismalRecord } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import "@/features/parish-admin/requests/AdminFindRecordPage.css";
import { AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";
import { PAGE_TITLE_CLASS, PAGE_WIDTH_CLASS } from "@/features/parish-admin/components/adminPageStyles";
import { AdminBackLink } from "@/features/parish-admin/components/AdminBackLink";

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
function calendarDay(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

function sameCalendarDay(a: string | undefined, b: string | undefined) {
  const left = calendarDay(a);
  const right = calendarDay(b);
  return Boolean(left && right && left === right);
}

function displayDate(value: string | undefined) {
  const day = calendarDay(value);
  return day ? formatRecordDate(day) : value;
}

function dateFieldMatches(filterValue: string, isoDate: string) {
  const target = norm(filterValue);
  if (!target) return true;
  if (sameCalendarDay(filterValue, isoDate)) return true;
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

function nameMatches(filter: string, full: string) {
  const target = norm(filter);
  const hay = norm(full);
  if (!target) return true;
  if (hay.includes(target)) return true;
  const words = target.split(/\s+/).filter((word) => word.length > 1);
  if (words.length === 0) return false;
  const hits = words.filter((word) => hay.includes(word)).length;
  return hits >= Math.min(2, words.length);
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
    if (!nameMatches(f.name, full)) return false;
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
  if (sameCalendarDay(a, b)) return "match";
  if (calendarDay(a) && calendarDay(b)) return "miss";
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

function searchLedger(
  records: BaptismalRecord[],
  filters: MatchFilters,
  sponsorsByRecordId: Record<string, RecordSponsor[]>
) {
  const strict = searchRecords(records, filters, sponsorsByRecordId);
  if (strict.length > 0 || !norm(filters.name)) return strict;
  return searchRecords(records, { ...emptyFilters, name: filters.name }, sponsorsByRecordId);
}

export function AdminFindRecordPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { requestId = "" } = useParams();

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
  const [matchFlash, setMatchFlash] = useState<{ count: number; id: number } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchFlash) return;
    const timer = window.setTimeout(() => setMatchFlash(null), 3200);
    return () => window.clearTimeout(timer);
  }, [matchFlash]);

  function flashMatches(count: number) {
    if (count > 0) setMatchFlash({ count, id: Date.now() });
    else setMatchFlash(null);
  }

  // Wait until request, records, AND sponsor assignments are loaded before
  // the first search. Otherwise we search an incomplete list, set
  // seeded=true, and never retry. Runs during render so the first results
  // appear in the same paint as the loaded request.
  if (request && !recordsLoading && !sponsorsLoading && !seeded) {
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
    const found = searchLedger(parishRecords, initial, sponsorsByRecordId);
    setResults(found);
    setSeeded(true);
    // Later flashes use Date.now() ids, so 0 never collides with them.
    if (found.length > 0) setMatchFlash({ count: found.length, id: 0 });
  }

  if (requestLoading || (request && (recordsLoading || sponsorsLoading) && !seeded)) {
    return (
      <div>
        <AdminBackLink />
        <p className="text-admin-body text-admin-ink-muted">Loading request…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div>
        <AdminBackLink />
        <h1 className={`mb-1 ${PAGE_TITLE_CLASS}`}>Request not found</h1>
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
    const found = searchLedger(parishRecords, filters, sponsorsByRecordId);
    setResults(found);
    flashMatches(found.length);
  }

  async function handleLink(record: BaptismalRecord) {
    setLinkError(null);
    try {
      await linkRequestToRecord(currentRequest.id, record.id);
      setReviewRecord(null);
      setConfirmedRecord(record);
      setStatus("confirmed");
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Could not link this record.");
    }
  }

  async function handleReject() {
    const note = rejectReason.trim();
    setRejectError(null);
    if (!note) {
      setRejectError("Tell the parishioner why, so they know what to do next.");
      return;
    }
    try {
      await rejectAdminRequest(currentRequest.id, note);
      setRejectedNote(note);
      setRejectOpen(false);
      setStatus("rejected");
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Could not reject this request.");
    }
  }

  const columns: AdminTableColumn<BaptismalRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      sortValue: (r) => baptismRecordRef(r),
      render: (r) => <span className="admin-table__primary">{baptismRecordRef(r)}</span>,
    },
    { key: "name", header: "Name", sortValue: (r) => recordFullName(r), render: (r) => recordFullName(r) },
    {
      key: "dateOfBaptism",
      header: "Bapt. date",
      sortValue: (r) => r.dateOfBaptism,
      render: (r) => formatTableDate(r.dateOfBaptism),
    },
    {
      key: "dateOfBirth",
      header: "Birthdate",
      sortValue: (r) => r.dateOfBirth,
      render: (r) => formatTableDate(r.dateOfBirth),
    },
    { key: "mother", header: "Mother", sortValue: (r) => recordMotherName(r), render: (r) => recordMotherName(r) },
    { key: "father", header: "Father", sortValue: (r) => recordFatherName(r), render: (r) => recordFatherName(r) },
    {
      key: "sponsors",
      header: "Godparents",
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
          className="admin-table__action disabled:cursor-not-allowed disabled:opacity-40"
        >
          Review match
        </button>
      ),
    },
  ];

  return (
    <div className={PAGE_WIDTH_CLASS}>
      <AdminBackLink />

      <AdminPageHeader
        title="Record Matching"
        description={`Request ${request.referenceNo} · ${subjectName}`}
        actions={
          <>
            <StatusPill status={status} />
            <AdminButton variant="danger" size="sm" onClick={() => setRejectOpen(true)} disabled={closed}>
              Reject request
            </AdminButton>
          </>
        }
      />

      {status === "confirmed" && confirmedRecord && (
        <StatusBanner tone="confirmed">
          <b className="font-serif text-admin-body font-semibold">
            Record confirmed — {baptismRecordRef(confirmedRecord)}
          </b>
          <div className="mt-0.5 text-admin-support opacity-90">
            {recordFullName(confirmedRecord)} matched to this request. The certificate can now be
            issued from the confirmed ledger entry.{" "}
            <Link
              to={recordDetailPath(parish.slug, "baptismal", confirmedRecord.id)}
              className="font-semibold underline decoration-admin-green-700/40 underline-offset-2 hover:decoration-admin-green-700"
            >
              View record
            </Link>
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
        <div className="match-pair">
          <article className="match-card">
            <header className="match-card__head">
              <h2 className="match-card__title font-sans">Request on file</h2>
              <span className="match-card__pill">
                <span className="match-card__pill-dot" aria-hidden="true" />
                On file
              </span>
            </header>
            <div className="match-card__body">
              <MatchReadRow label="Name of baptized" value={details?.subjectName || "—"} />
              <MatchReadRow
                label="Baptismal date"
                value={details?.baptismDate || "Not stated"}
                muted={!details?.baptismDate}
              />
              <MatchReadRow label="Birthdate" value={details?.birthdate || "—"} />
              <MatchReadRow label="Place of birth" value={details?.birthplace || "—"} />
              <MatchReadRow label="Mother's name" value={details?.motherName || "—"} />
              <MatchReadRow label="Father's name" value={details?.fatherName || "—"} />
              <MatchReadRow label="Sponsor 1" value={details?.sponsor1 || "—"} />
              <MatchReadRow label="Sponsor 2" value={details?.sponsor2 || "—"} />
            </div>
            <footer className="match-card__foot">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => console.info("[mock] view supporting docs", request.id)}
              >
                <FileIcon />
                View supporting docs
              </AdminButton>
            </footer>
          </article>

          <article className="match-card">
            <header className="match-card__head">
              <h2 className="match-card__title font-sans">Search the ledger</h2>
              <span className="match-card__meta">Editable</span>
            </header>
            <div className="match-card__body">
              <MatchSearchRow
                label="Name of baptized"
                value={filters.name}
                placeholder="Juan Dela Cruz"
                onChange={(v) => setFilter("name", v)}
              />
              <MatchSearchRow
                label="Baptismal date"
                value={filters.baptismDate}
                placeholder="If known"
                onChange={(v) => setFilter("baptismDate", v)}
              />
              <MatchSearchRow
                label="Birthdate"
                value={filters.birthdate}
                placeholder="January 18, 2005"
                onChange={(v) => setFilter("birthdate", v)}
              />
              <MatchSearchRow
                label="Place of birth"
                value={filters.placeOfBirth}
                placeholder="Manila, Metro Manila"
                onChange={(v) => setFilter("placeOfBirth", v)}
              />
              <MatchSearchRow
                label="Mother's name"
                value={filters.mother}
                placeholder="Maria Santos"
                onChange={(v) => setFilter("mother", v)}
              />
              <MatchSearchRow
                label="Father's name"
                value={filters.father}
                placeholder="Jose Reyes"
                onChange={(v) => setFilter("father", v)}
              />
              <MatchSearchRow
                label="Sponsor 1"
                value={filters.sponsor1}
                placeholder="Juanita Alfonso"
                onChange={(v) => setFilter("sponsor1", v)}
              />
              <MatchSearchRow
                label="Sponsor 2"
                value={filters.sponsor2}
                placeholder="Emilio Javier"
                onChange={(v) => setFilter("sponsor2", v)}
              />
            </div>
            <footer className="match-card__foot">
              <AdminButton size="sm" onClick={runSearch}>
                <SearchIcon />
                Search ledger
              </AdminButton>
              <p className="match-card__hint">Pre-filled from the request. Narrow a field, then search.</p>
            </footer>
          </article>
        </div>

        <article className={`match-card match-card--results${results.length > 0 ? " match-card--has-hits" : ""}`}>
          <header className="match-card__head">
            <h2 className="match-card__title font-sans">Candidate records</h2>
            <ResultBadge count={results.length} pulse={matchFlash != null && results.length > 0} />
          </header>
          {matchFlash && (
            <div key={matchFlash.id} className="match-found-toast" role="status">
              <span className="match-found-toast__check" aria-hidden="true">
                <CheckIcon />
              </span>
              <span>
                {matchFlash.count === 1
                  ? "Matching record found"
                  : `${matchFlash.count} matching records found`}
              </span>
            </div>
          )}
          <div className="match-card__body">
            <AdminTable
              columns={columns}
              rows={results}
              getRowKey={(r) => r.id}
              emptyMessage="No matching entry found. Try loosening a field — a maiden name, spelling, or exact date can differ from the request — or reject the request if the entry genuinely can't be located."
            />
          </div>
        </article>
      </div>

      {reviewRecord && (
        <ReviewMatchModal
          requestName={filters.name}
          requestBirthdate={displayDate(filters.birthdate)}
          requestBaptismDate={filters.baptismDate}
          requestBirthplace={filters.placeOfBirth}
          requestMother={filters.mother}
          requestFather={filters.father}
          requestSponsor1={filters.sponsor1}
          requestSponsor2={filters.sponsor2}
          record={reviewRecord}
          recordSponsors={sponsorsByRecordId[reviewRecord.id] ?? []}
          onClose={() => {
            setLinkError(null);
            setReviewRecord(null);
          }}
          onLink={() => handleLink(reviewRecord)}
          error={linkError}
        />
      )}

      {rejectOpen && (
        <RejectModal
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onCancel={() => {
            setRejectError(null);
            setRejectOpen(false);
          }}
          onConfirm={handleReject}
          error={rejectError}
        />
      )}
    </div>
  );
}

function ReviewMatchModal({
  requestName,
  requestBirthdate,
  requestBaptismDate,
  requestBirthplace,
  requestMother,
  requestFather,
  requestSponsor1,
  requestSponsor2,
  record,
  recordSponsors,
  onClose,
  onLink,
  error,
}: {
  requestName: string;
  requestBirthdate?: string;
  requestBaptismDate?: string;
  requestBirthplace?: string;
  requestMother?: string;
  requestFather?: string;
  requestSponsor1?: string;
  requestSponsor2?: string;
  record: BaptismalRecord;
  recordSponsors: RecordSponsor[];
  onClose: () => void;
  onLink: () => void;
  error?: string | null;
}) {
  // Ledger sponsors aren't stored as "Sponsor 1" / "Sponsor 2" slots — the
  // primary assignment (e.g. Ninang) sorts first, so pair it against
  // whichever request field is filled first for a sensible side-by-side.
  const fields: [string, string | undefined, string][] = [
    ["Name of baptized", requestName, recordFullName(record)],
    ["Birthdate", displayDate(requestBirthdate), formatRecordDate(record.dateOfBirth)],
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
    <AdminModalFrame
      onClose={onClose}
      layer="z-50"
      panelClassName="flex max-h-[90vh] max-w-[620px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
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
              <span className="text-admin-label text-admin-ink-muted">
                {requestBaptismDate
                  ? sameCalendarDay(requestBaptismDate, record.dateOfBaptism)
                    ? `(request: ${displayDate(requestBaptismDate)})`
                    : `(request says ${displayDate(requestBaptismDate)})`
                  : "(not stated in request)"}
              </span>
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

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        {error && <p className="mr-auto text-admin-body text-admin-red-700">{error}</p>}
        <AdminButton variant="secondary" onClick={onClose}>
          Back to results
        </AdminButton>
        <AdminButton onClick={onLink}>
          <LinkIcon />
          Confirm this record
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}

function RejectModal({
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  error,
}: {
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  error?: string | null;
}) {
  return (
    <AdminModalFrame
      onClose={onCancel}
      layer="z-50"
      panelClassName="flex max-w-[460px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
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
          Use this when no matching entry can be found in the baptismal ledger. The parishioner sees
          your reason in their portal.
        </p>
        <label className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
          Reason for the parishioner
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g. We found no entry with these details in Books 09–21 (1993–1995). Please bring your PSA birth certificate to the office."
          className="min-h-[80px] w-full resize-y rounded-[var(--radius)] border border-admin-border bg-admin-surface-alt px-2.5 py-2 text-admin-body text-admin-ink"
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        {error && <p className="mr-auto text-admin-body text-admin-red-700">{error}</p>}
        <AdminButton variant="secondary" onClick={onCancel}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" onClick={onConfirm}>
          Reject request
        </AdminButton>
      </div>
    </AdminModalFrame>
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
function ResultBadge({ count, pulse }: { count: number; pulse?: boolean }) {
  if (count === 0) {
    return <span className="match-card__meta">No matches</span>;
  }
  return (
    <span className={`match-card__pill${pulse ? " match-card__pill--pulse" : ""}`}>
      <span className="match-card__pill-dot" aria-hidden="true" />
      {count === 1 ? "1 match" : `${count} matches`}
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


// Compact label + value row for the request card — same footprint as search fields.
function MatchReadRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="match-row">
      <span className="match-row__label">{label}</span>
      <span className={`match-row__value${muted ? " match-row__value--muted" : ""}`} title={value}>
        {value}
      </span>
    </div>
  );
}

function MatchSearchRow({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = `match-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="match-row">
      <label className="match-row__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="match-row__input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
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