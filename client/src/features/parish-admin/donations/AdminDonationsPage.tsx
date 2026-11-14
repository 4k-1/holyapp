import { AdminRowActions } from "@/components/ui/AdminRowActions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { useOpenFromLink } from "@/features/parish-admin/components/useOpenFromLink";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { PrintReceiptDialog } from "@/features/parish-admin/components/PrintReceiptDialog";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { isParishAdminRole } from "@/features/parish-admin/permissions";
import { listDonations } from "./api/donationsApi";
import { DonationSparkline } from "./components/DonationSparkline";
import { RecordDonationModal } from "./components/RecordDonationModal";
import { VoidDonationModal } from "./components/VoidDonationModal";
import { SettleDonationModal } from "./components/SettleDonationModal";
import {
  countedDonations,
  waitingDonations,
  donationReceiptNumber,
  donationDateFilterLabel,
  emptyDonationDateFilter,
  filterDonationsByDate,
  formatAmount,
  donationReceipt,
  formatDonationDate,
  monthlyTrend,
  type DonationDateFilter,
} from "./donationsHelpers";
import { donationTypeBadgeTone } from "./types";
import type { Donation } from "./types";
import type { Parish } from "@/types";
import { SkeletonList } from "@/components/ui/Skeleton";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";
import { userCan } from "@/features/parish-admin/access";

export function AdminDonationsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();
  // Voiding and correcting money is for the admin only, as a check on the office.
  const canVoid = isParishAdminRole(user?.role);
  const canRecord = userCan(user, "donations", "manage");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // The dashboard's "Record a donation" opens the form straight away.
  const [modalOpen, setModalOpen] = useState(useOpenFromLink("donation"));
  const [receiptFor, setReceiptFor] = useState<Donation | null>(null);
  const [voiding, setVoiding] = useState<Donation | null>(null);
  const [correcting, setCorrecting] = useState<Donation | null>(null);
  const [settling, setSettling] = useState<{ donation: Donation; outcome: "cleared" | "bounced" } | null>(null);
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

  // Voided gifts stay in the table but count toward no total, trend or donor count.
  const trend = useMemo(() => monthlyTrend(countedDonations(donations)), [donations]);
  const hasTrend = trend.some((point) => point.value > 0);

  const filtered = useMemo(
    () => filterDonationsByDate(donations, appliedFilter),
    [donations, appliedFilter]
  );
  const counted = useMemo(() => countedDonations(filtered), [filtered]);
  const voidedCount = filtered.filter((d) => d.voided).length;
  const waiting = useMemo(() => waitingDonations(filtered), [filtered]);
  const waitingTotal = waiting.reduce((sum, d) => sum + d.amount, 0);
  const bouncedCount = filtered.filter((d) => !d.voided && d.clearing?.status === "bounced").length;

  const receiptById = useMemo(
    () => new Map(donations.map((d) => [d.id, donationReceiptNumber(d)])),
    [donations]
  );

  const filterActive = Boolean(appliedFilter.from || appliedFilter.to);
  const filterLabel = donationDateFilterLabel(appliedFilter);

  const stats = useMemo(() => {
    const totalRecorded = counted.reduce((sum, d) => sum + d.amount, 0);
    const namedDonors = new Set(counted.filter((d) => d.donorName).map((d) => d.donorName)).size;
    const avgDonation = counted.length ? totalRecorded / counted.length : 0;

    return { totalRecorded, namedDonors, avgDonation, entryCount: counted.length };
  }, [counted]);

  const donorFirstSeen = useMemo(() => {
    const map: Record<string, string> = {};
    counted.forEach((d) => {
      if (!d.donorName) return;
      if (!map[d.donorName] || d.donationDate < map[d.donorName]) map[d.donorName] = d.donationDate;
    });
    return map;
  }, [counted]);

  const rows = filtered;

  const columns: AdminTableColumn<Donation>[] = [
    { key: "date", header: "Date", sortValue: (d) => d.donationDate, render: (d) => formatDonationDate(d.donationDate) },
    {
      key: "receiptNo",
      header: "Receipt no.",
      sortValue: (d) => donationReceiptNumber(d),
      render: (d) => (
        <>
          <span className={`whitespace-nowrap tabular-nums ${d.voided ? "text-admin-ink-faint line-through" : "text-admin-ink"}`}>
            {donationReceiptNumber(d)}
          </span>
          {d.voided && (
            <span className="ml-1.5" title={`Voided by ${d.voided.by}: ${d.voided.reason}`}>
              <AdminBadge tone="red">Voided</AdminBadge>
            </span>
          )}
          {!d.voided && d.clearing?.status === "pending" && (
            <span className="ml-1.5" title={d.reference ? `${d.reference}${d.bank ? `, ${d.bank}` : ""}` : undefined}>
              <AdminBadge tone="amber">Waiting to clear</AdminBadge>
            </span>
          )}
          {!d.voided && d.clearing?.status === "bounced" && (
            <span className="ml-1.5" title={`Marked bounced by ${d.clearing.by ?? "the office"}: ${d.clearing.reason ?? ""}`}>
              <AdminBadge tone="red">Bounced</AdminBadge>
            </span>
          )}
          {d.replacesId && receiptById.get(d.replacesId) && (
            <span className="block text-admin-label text-admin-ink-muted">
              Corrects {receiptById.get(d.replacesId)}
            </span>
          )}
          {d.voided && (
            <span className="block max-w-[220px] truncate text-admin-label text-admin-ink-muted" title={d.voided.reason}>
              {d.voided.reason}
            </span>
          )}
        </>
      ),
    },
    {
      key: "donor",
      header: "Donor",
      sortValue: (d) => d.donorName,
      render: (d) => (
        <>
          {d.donorName ? (
            <span className="text-admin-ink">{d.donorName}</span>
          ) : (
            <span className="italic text-admin-ink-faint">Anonymous</span>
          )}
          {!d.voided && d.donorName && donorFirstSeen[d.donorName] === d.donationDate && (
            <span className="ml-1.5">
              <AdminBadge tone="gold">New donor</AdminBadge>
            </span>
          )}
        </>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (d) => d.donationType,
      render: (d) => <AdminBadge tone={donationTypeBadgeTone(d.donationType)}>{d.donationType}</AdminBadge>,
    },
    {
      key: "purpose",
      header: "Purpose",
      sortValue: (d) => d.purpose,
      className: "max-w-[180px]",
      render: (d) => (
        <span className="block truncate text-admin-ink-muted" title={d.remarks || d.purpose || undefined}>
          {d.purpose || "—"}
        </span>
      ),
    },
    {
      key: "recordedBy",
      header: "Recorded by",
      sortValue: (d) => d.recordedBy,
      render: (d) => <span className="text-admin-ink-muted">{d.recordedBy}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      sortValue: (d) => d.amount,
      className: "text-right",
      render: (d) => (
        <span
          className={
            d.voided || d.clearing?.status === "bounced"
              ? "text-admin-ink-faint line-through"
              : d.clearing?.status === "pending"
                ? "font-semibold text-admin-ink-muted"
                : "font-semibold text-admin-ink"
          }
        >
          {formatAmount(d.amount)}
        </span>
      ),
    },
    {
      key: "receipt",
      header: "Actions",
      className: "text-right",
      render: (d) =>
        d.voided ? null : (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <button type="button" onClick={() => setReceiptFor(d)} className="admin-table__action">
              Receipt
            </button>
            <AdminRowActions
              label={`More for receipt ${donationReceiptNumber(d)}`}
              actions={[
                {
                  label: "Mark cleared",
                  onSelect: () => setSettling({ donation: d, outcome: "cleared" }),
                  hidden: !(canVoid && d.clearing?.status === "pending"),
                },
                { label: "Correct", onSelect: () => setCorrecting(d), hidden: !(canVoid && d.source === "office") },
                {
                  label: "Mark bounced",
                  onSelect: () => setSettling({ donation: d, outcome: "bounced" }),
                  danger: true,
                  hidden: !(canVoid && d.clearing?.status === "pending"),
                },
                {
                  label: "Void",
                  onSelect: () => setVoiding(d),
                  danger: true,
                  hidden: !(canVoid && d.source !== "mass_intention"),
                },
              ]}
            />
          </span>
        ),
    },
  ];

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
    <AdminPage>
      <AdminPageHeader
        title="Donations"
        description="Gifts recorded at the office and given online through GCash."
        actions={canRecord && <AdminButton onClick={() => setModalOpen(true)}>+ Record donation</AdminButton>}
      />

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
        <SkeletonList rows={4} className="px-0" />
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
              {waiting.length > 0 && (
                <p className="-mt-2 mb-4 text-admin-support text-admin-gold-700">
                  Waiting to clear: {formatAmount(waitingTotal)} in {waiting.length}{" "}
                  {waiting.length === 1 ? "cheque or transfer" : "cheques and transfers"}, not counted yet
                </p>
              )}
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

          <AdminTable
            title={filterActive ? "Filtered donations" : "All donations"}
            subtitle={`${rows.length} ${rows.length === 1 ? "entry" : "entries"}${
              voidedCount ? ` · ${voidedCount} voided, not counted in totals` : ""
            }${bouncedCount ? ` · ${bouncedCount} bounced, not counted` : ""}`}
            columns={columns}
            rows={rows}
            getRowKey={(d) => d.id}
            defaultSort={{ key: "date", dir: "desc" }}
            pageKey="donations"
            emptyMessage={
              filterActive
                ? "No donations match this date range."
                : "No donations yet. Gifts made in the parishioner portal and ones you record here will appear in this list."
            }
          />
        </>
      )}

      {receiptFor && (
        <PrintReceiptDialog
          parish={parish}
          receipt={donationReceipt(receiptFor)}
          defaultReceivedFrom={receiptFor.donorName ?? ""}
          onClose={() => setReceiptFor(null)}
        />
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

      {correcting && (
        <RecordDonationModal
          parishId={parish.id}
          correcting={correcting}
          onClose={() => setCorrecting(null)}
          onRecorded={() => {
            setCorrecting(null);
            reload();
          }}
        />
      )}

      {settling && (
        <SettleDonationModal
          donation={settling.donation}
          outcome={settling.outcome}
          onClose={() => setSettling(null)}
          onDone={() => {
            setSettling(null);
            reload();
          }}
        />
      )}

      {voiding && (
        <VoidDonationModal
          donation={voiding}
          onClose={() => setVoiding(null)}
          onVoided={() => {
            setVoiding(null);
            reload();
          }}
        />
      )}
    </AdminPage>
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
