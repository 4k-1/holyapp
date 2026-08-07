import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import {
  initials,
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

function norm(s: string | undefined) {
  return (s || "").toLowerCase().trim();
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

export function AdminFindRecordPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { requestId = "" } = useParams();
  const navigate = useNavigate();

  const request = MOCK_REQUESTS.find((r) => r.id === requestId && r.parishId === parish.id);
  const details = request?.details;
  const parishRecords = useMemo(
    () => MOCK_BAPTISMAL_RECORDS.filter((r) => r.parishId === parish.id),
    [parish.id]
  );

  const [filters, setFilters] = useState<MatchFilters>(() => ({
    name: details?.subjectName ?? "",
    baptismDate: details?.baptismDate ?? "",
    birthdate: details?.birthdate ?? "",
    birthplace: details?.birthplace ?? "",
    mother: details?.motherName ?? "",
    father: details?.fatherName ?? "",
    sponsor1: details?.sponsor1 ?? "",
    sponsor2: details?.sponsor2 ?? "",
  }));
  const [results, setResults] = useState(() =>
    searchRecords(parishRecords, {
      name: details?.subjectName ?? "",
      baptismDate: details?.baptismDate ?? "",
      birthdate: details?.birthdate ?? "",
      birthplace: details?.birthplace ?? "",
      mother: details?.motherName ?? "",
      father: details?.fatherName ?? "",
      sponsor1: "",
      sponsor2: "",
    })
  );
  const [reviewRecord, setReviewRecord] = useState<BaptismalRecord | null>(null);

  if (!request) {
    return (
      <div className="p-6">
        <BackLink />
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Request not found</h1>
      </div>
    );
  }

  const subjectName = details?.subjectName ?? request.requesterId;

  function setFilter<K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function runSearch() {
    setResults(searchRecords(parishRecords, filters));
  }

  function handleReject() {
    request.status = "rejected";
    request.rejectionReason = "No matching baptismal record found in parish register.";
    console.info("[mock] rejected request", request.id);
    navigate("../..");
  }

  function handleLink(record: BaptismalRecord) {
    request.linkedRecordId = record.id;
    request.status = "processing";
    request.payment = request.payment ?? { status: "unpaid", amount: 100 };
    if (request.payment.status !== "paid") {
      request.payment = { ...request.payment, status: "unpaid" };
    }
    console.info("[mock] linked record", record.id, "to request", request.id);
    setReviewRecord(null);
    navigate("../..");
  }

  const columns: AdminTableColumn<BaptismalRecord>[] = [
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
          className="font-semibold text-admin-green-700 hover:underline"
        >
          View Details
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <BackLink />

      <div className="mb-5">
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Record Matching</h1>
        <p className="text-[13.5px] text-admin-ink-muted">
          Request {request.id} · {subjectName}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <AdminCard className="p-5 px-[22px]">
          <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Request Information
          </h2>

          <div className="mb-[18px] flex items-center gap-3 border-b border-admin-border pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-admin-green-100 font-serif text-[15px] font-bold text-admin-green-900">
              {initials(subjectName)}
            </div>
            <div>
              <p className="text-[15.5px] font-semibold leading-snug text-admin-ink">{subjectName}</p>
              <p className="mt-0.5 text-[12.5px] text-admin-ink-muted">
                {sacramentLabels[request.sacramentType]} Certificate · {request.purpose}
              </p>
            </div>
          </div>

          <SectionLabel>Sacrament details</SectionLabel>
          <div className="mb-[18px]">
            <InfoRow label="Name of baptized" value={details?.subjectName || "—"} />
            <InfoRow label="Birthdate" value={details?.birthdate || "—"} />
            <InfoRow label="Birthplace" value={details?.birthplace || "—"} last />
          </div>

          <SectionLabel>Family &amp; sponsors</SectionLabel>
          <div className="mb-[18px]">
            <InfoRow label="Mother" value={details?.motherName || "—"} />
            <InfoRow label="Father" value={details?.fatherName || "—"} />
            <InfoRow label="Sponsor 1" value={details?.sponsor1 || "—"} />
            <InfoRow label="Sponsor 2" value={details?.sponsor2 || "—"} last />
          </div>

          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => console.info("[mock] view supporting docs", request.id)}
          >
            <FileIcon />
            View Supporting Docs
          </AdminButton>
        </AdminCard>

        <AdminCard className="p-5 px-[22px]">
          <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Filter
          </h2>

          <div className="grid grid-cols-1 gap-x-2.5 gap-y-0 sm:grid-cols-2">
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
            <AdminField label="Mother">
              <AdminInput value={filters.mother} onChange={(e) => setFilter("mother", e.target.value)} />
            </AdminField>
            <AdminField label="Father">
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

          <div className="mt-2 flex items-center justify-between gap-2.5">
            <AdminButton variant="danger" onClick={handleReject}>
              Reject
            </AdminButton>
            <AdminButton onClick={runSearch}>
              <SearchIcon />
              Search
            </AdminButton>
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="px-4 pt-4">
          <h2 className="mb-2.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
            Results
          </h2>
        </div>
        <AdminTable
          columns={columns}
          rows={results}
          getRowKey={(r) => r.id}
          emptyMessage="No matching records found. Try adjusting the filters."
        />
      </AdminCard>

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
  record: BaptismalRecord;
  onClose: () => void;
  onLink: () => void;
}) {
  const fields: [string, string, string][] = [
    ["Name of baptized", requestName, recordFullName(record)],
    ["Birthdate", requestBirthdate || "Not provided", record.dob],
    ["Birthplace", requestBirthplace || "Not provided", record.birthplace],
    ["Mother's name", requestMother || "Not provided", recordMotherName(record)],
    ["Father's name", requestFather || "Not provided", recordFatherName(record)],
    ["Sponsor 1", requestSponsor1 || "Not provided", record.sponsor1],
    ["Sponsor 2", requestSponsor2 || "Not provided", record.sponsor2],
  ];
  const matchCount = fields.filter(([, a, b]) => norm(a) === norm(b)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_8px_28px_-6px_rgba(10,40,30,0.15)]">
        <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-admin-ink">Review match</h3>
            <p className="mt-0.5 text-[12.5px] text-admin-ink-muted">
              {matchCount} of {fields.length} fields match
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

        <div className="overflow-y-auto px-6 py-[18px]">
          <div className="mb-0.5 flex justify-between text-[11px] font-semibold uppercase tracking-[0.4px] text-admin-ink-muted">
            <span>Request info</span>
            <span>
              Baptismal record {record.book}:{record.page}
            </span>
          </div>

          {fields.map(([label, left, right]) => {
            const isMatch = norm(left) === norm(right);
            return (
              <div
                key={label}
                className="grid grid-cols-[1fr_20px_1fr] items-center gap-2.5 border-b border-admin-border py-2.5 last:border-b-0"
              >
                <div>
                  <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.4px] text-admin-ink-muted">
                    {label}
                  </div>
                  <div
                    className={`text-[13.5px] ${
                      isMatch ? "text-admin-ink" : "font-semibold text-admin-amber-700"
                    }`}
                  >
                    {left}
                  </div>
                </div>
                <div
                  className={`text-center text-sm ${
                    isMatch ? "text-admin-green-700" : "text-admin-amber-700"
                  }`}
                >
                  {isMatch ? "✓" : "⚠"}
                </div>
                <div className={`text-[13.5px] ${isMatch ? "text-admin-ink" : "font-semibold text-admin-ink"}`}>
                  {right}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose}>
            Back
          </AdminButton>
          <AdminButton onClick={onLink}>
            <LinkIcon />
            Link record
          </AdminButton>
        </div>
      </div>
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
      Back to Requests
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-0.5 mt-5 font-sans text-[10.5px] font-bold uppercase tracking-[0.6px] text-admin-gold-700 first:mt-0">
      {children}
    </div>
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
