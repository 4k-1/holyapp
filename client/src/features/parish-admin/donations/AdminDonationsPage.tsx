import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { listDonations } from "./api/donationsApi";
import { DonationSparkline } from "./components/DonationSparkline";
import { RecordDonationModal } from "./components/RecordDonationModal";
import {
  donationDateFilterLabel,
  emptyDonationDateFilter,
  filterDonationsByDate,
  formatAmount,
  formatDonationDate,
  monthlyTrend,
  type DonationDateFilter,
} from "./donationsHelpers";
import { donationTypeBadgeTone } from "./types";
import type { Donation } from "./types";
import type { Parish } from "@/types";

export function AdminDonationsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState<DonationDateFilter>(emptyDonationDateFilter);
  const [appliedFilter, setAppliedFilter] = useState<DonationDateFilter>(emptyDonationDateFilter);

  const fetchDonations = useCallback(
    () =>
      listDonations(parish.id)
        .then((data) => {
          setDonations(data);
          setLoadError("");
        })
        .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Couldn't load donations."))
        .finally(() => setLoading(false)),
    [parish.id]
  );

  function reload() {
    setLoading(true);
    return fetchDonations();
  }

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const trend = useMemo(() => monthlyTrend(donations), [donations]);
  const hasTrend = trend.some((point) => point.value > 0);

  const filtered = useMemo(
    () => filterDonationsByDate(donations, appliedFilter),
    [donations, appliedFilter]
  );

  const filterActive = Boolean(appliedFilter.from || appliedFilter.to);
  const filterLabel = donationDateFilterLabel(appliedFilter);

  const stats = useMemo(() => {
    const totalRecorded = filtered.reduce((sum, d) => sum + d.amount, 0);
    const namedDonors = new Set(filtered.filter((d) => d.donorName).map((d) => d.donorName)).size;
    const avgDonation = filtered.length ? totalRecorded / filtered.length : 0;

    return { totalRecorded, namedDonors, avgDonation, entryCount: filtered.length };
  }, [filtered]);

  const donorFirstSeen = useMemo(() => {
    const map: Record<string, string> = {};
    filtered.forEach((d) => {
      if (!d.donorName) return;
      if (!map[d.donorName] || d.donationDate < map[d.donorName]) map[d.donorName] = d.donationDate;
    });
    return map;
  }, [filtered]);

  const rows = useMemo(
    () => [...filtered].sort((a, b) => (a.donationDate < b.donationDate ? 1 : -1)),
    [filtered]
  );

  function setDraftField(key: keyof DonationDateFilter, value: string) {
    setDraftFilter((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilter() {
    if (draftFilter.from && draftFilter.to && draftFilter.from > draftFilter.to) {
      setAppliedFilter({ from: draftFilter.to, to: draftFilter.from });
      setDraftFilter({ from: draftFilter.to, to: draftFilter.from });
      return;
    }
    setAppliedFilter({ ...draftFilter });
  }

  function clearFilter() {
    const empty = emptyDonationDateFilter();
    setDraftFilter(empty);
    setAppliedFilter(empty);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-admin-page font-semibold text-admin-ink">Donations</h1>
          <p className="mt-1 text-admin-body text-admin-ink-muted">
            Gifts recorded at the office and given online through GCash.
          </p>
        </div>
        <AdminButton onClick={() => setModalOpen(true)}>+ Record donation</AdminButton>
      </div>

      <AdminCard className="mb-4 p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
          Date range
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <AdminField label="From" className="mb-0 w-[160px]">
            <AdminInput
              type="date"
              value={draftFilter.from}
              onChange={(e) => setDraftField("from", e.target.value)}
            />
          </AdminField>
          <AdminField label="To" className="mb-0 w-[160px]">
            <AdminInput
              type="date"
              value={draftFilter.to}
              min={draftFilter.from || undefined}
              onChange={(e) => setDraftField("to", e.target.value)}
            />
          </AdminField>
          <div className="flex gap-2 pb-0.5">
            <AdminButton onClick={applyFilter}>
              <SearchIcon />
              Apply
            </AdminButton>
            {filterActive && (
              <AdminButton variant="secondary" onClick={clearFilter}>
                Clear
              </AdminButton>
            )}
          </div>
        </div>
        {filterActive && filterLabel && (
          <p className="mt-3 text-admin-support text-admin-ink-muted">
            Showing donations {filterLabel.toLowerCase()}.
          </p>
        )}
      </AdminCard>

      {loading ? (
        <p className="text-admin-body text-admin-ink-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-admin-body text-red-700" role="alert">
          {loadError}
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface p-5">
              <p className="mb-1 text-admin-body font-semibold text-admin-ink">
                {filterActive ? "Total in selected range" : "Total donations (all time)"}
              </p>
              <div className="mb-4 flex items-baseline gap-2.5">
                <p className="font-sans text-[1.75rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-admin-ink">
                  {formatAmount(stats.totalRecorded)}
                </p>
              </div>
              {!filterActive && hasTrend && (
                <DonationSparkline data={trend} highlightIndex={trend.length - 1} />
              )}
            </div>

            <div className="flex flex-col gap-4">
              <AdminStatCard label="Named donors" value={stats.namedDonors} />
              <AdminStatCard label="Entries" value={stats.entryCount} />
              <AdminStatCard label="Average donation" value={formatAmount(stats.avgDonation)} />
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface">
            <div className="flex items-baseline justify-between px-5 pt-4 pb-1">
              <p className="font-serif text-admin-section font-semibold text-admin-ink">
                {filterActive ? "Filtered donations" : "All donations"}
              </p>
              <span className="text-admin-support text-admin-ink-muted">{rows.length} entries</span>
            </div>
            <table className="w-full text-left text-admin-body">
              <thead>
                <tr className="text-admin-label font-semibold uppercase tracking-wide text-admin-ink-muted">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5">Donor</th>
                  <th className="px-5 py-2.5">Type</th>
                  <th className="px-5 py-2.5">Purpose</th>
                  <th className="px-5 py-2.5">Recorded by</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const isNew = d.donorName && donorFirstSeen[d.donorName] === d.donationDate;
                  return (
                    <tr key={d.id} className="border-t border-admin-border">
                      <td className="px-5 py-2.5 text-admin-ink">{formatDonationDate(d.donationDate)}</td>
                      <td className="px-5 py-2.5">
                        {d.donorName ? (
                          <span className="text-admin-ink">{d.donorName}</span>
                        ) : (
                          <span className="italic text-admin-ink-faint">Anonymous</span>
                        )}
                        {isNew && (
                          <span className="ml-1.5">
                            <AdminBadge tone="gold">New donor</AdminBadge>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <AdminBadge tone={donationTypeBadgeTone(d.donationType)}>
                          {d.donationType}
                        </AdminBadge>
                      </td>
                      <td
                        className="max-w-[180px] truncate px-5 py-2.5 text-admin-ink-muted"
                        title={d.remarks || d.purpose || undefined}
                      >
                        {d.purpose || "—"}
                      </td>
                      <td className="px-5 py-2.5 text-admin-ink-muted">
                        {d.recordedBy}
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold text-admin-ink">
                        {formatAmount(d.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="px-5 py-6 text-admin-body text-admin-ink-muted">
                {filterActive
                  ? "No donations match this date range."
                  : "No donations yet. Gifts made in the parishioner portal and ones you record here will appear in this list."}
              </p>
            )}
          </div>
        </>
      )}

      {modalOpen && (
        <RecordDonationModal
          parishId={parish.id}
          onClose={() => setModalOpen(false)}
          onRecorded={() => {
            setModalOpen(false);
            reload();
          }}
        />
      )}
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
