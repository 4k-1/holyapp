import { formatTableDate } from "@/lib/dates";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { CapacityBadge } from "@/features/parish-admin/intentions/components/CapacityBadge";
import {
  formatPeso,
  intentionLabel,
  donationTotal,
  printableIntentions,
} from "@/features/parish-admin/intentions/intentionsHelpers";
import type { MassIntentionRequest, MassIntentionStatus, MassSlotView } from "@/types";

interface MassSlotTableProps {
  slot: MassSlotView;
  markingId: string | null;
  /** True while a bulk action on this Mass is saving. */
  busy?: boolean;
  /** The Mass has already been celebrated: no new requests or confirmations, only catching up on "Said". */
  isPast?: boolean;
  onAddRequest: () => void;
  /** Prints this Mass's confirmed intentions for the presider. */
  onPrint: () => void;
  onConfirm: (intention: MassIntentionRequest) => void;
  onReject: (intention: MassIntentionRequest) => void;
  onMarkSaid: (intention: MassIntentionRequest) => void;
  onConfirmMany: (intentions: MassIntentionRequest[]) => Promise<void>;
  onRejectMany: (intentions: MassIntentionRequest[]) => Promise<void>;
  onMarkSaidMany: (intentions: MassIntentionRequest[]) => Promise<void>;
}

const STATUS_TONE: Record<MassIntentionStatus, "amber" | "green" | "muted" | "red"> = {
  pending: "amber",
  confirmed: "green",
  rejected: "red",
  said: "muted",
};

const STATUS_LABEL: Record<MassIntentionStatus, string> = {
  pending: "Request",
  confirmed: "Confirmed",
  rejected: "Rejected",
  said: "Said",
};

export function MassSlotTable({
  slot,
  markingId,
  busy = false,
  isPast = false,
  onAddRequest,
  onPrint,
  onConfirm,
  onReject,
  onMarkSaid,
  onConfirmMany,
  onRejectMany,
  onMarkSaidMany,
}: MassSlotTableProps) {
  const totalDonations = useMemo(() => donationTotal(slot.intentions), [slot.intentions]);
  const pending = useMemo(() => slot.intentions.filter((row) => row.status === "pending"), [slot.intentions]);
  const confirmed = useMemo(() => slot.intentions.filter((row) => row.status === "confirmed"), [slot.intentions]);
  const printable = printableIntentions(slot.intentions);
  const canDecide = !isPast && pending.length > 0;

  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  // Only rows still pending count, so confirmed or rejected ones drop out of the selection by themselves.
  const selectedRows = pending.filter((row) => selected.has(row.id));
  const allSelected = pending.length > 0 && selectedRows.length === pending.length;
  const someSelected = selectedRows.length > 0 && !allSelected;

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pending.map((row) => row.id)));
  }

  const columns: AdminTableColumn<MassIntentionRequest>[] = [
    ...(canDecide
      ? [
          {
            key: "select",
            header: "",
            className: "w-10",
            render: (row: MassIntentionRequest) =>
              row.status === "pending" ? (
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  disabled={busy}
                  aria-label={`Select ${intentionLabel(row)}`}
                  className="h-4 w-4 cursor-pointer accent-admin-green-700"
                />
              ) : null,
          },
        ]
      : []),
    {
      key: "intention",
      header: "Intention",
      sortValue: (row) => intentionLabel(row),
      render: (row) => (
        <span className={row.status === "rejected" ? "opacity-60" : undefined}>
          <span className={`block text-admin-ink ${row.status === "rejected" ? "line-through" : ""}`}>
            {intentionLabel(row)}
          </span>
          <span className="block text-admin-support text-admin-ink-muted">
            {row.requestedBy} · {formatTableDate(row.createdAt)}
          </span>
        </span>
      ),
    },
    {
      key: "donation",
      header: "Donation",
      sortValue: (row) => (row.payment === "none" ? null : row.offering),
      render: (row) =>
        row.payment === "none" ? (
          <span className="text-admin-ink-muted">—</span>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1.5 whitespace-nowrap">
            <span className="tabular-nums">{formatPeso(row.offering)}</span>
            {row.payment === "pending" && <AdminBadge tone="muted">GCash pending</AdminBadge>}
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => STATUS_LABEL[row.status],
      render: (row) => <AdminBadge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</AdminBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const saving = markingId === row.id;
        if (row.status === "pending" && !isPast) {
          return (
            <span className="inline-flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onConfirm(row)}
                disabled={saving || busy}
                className="admin-table__action disabled:opacity-45"
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => onReject(row)}
                disabled={saving || busy}
                className="admin-table__action text-admin-red-700 disabled:opacity-45"
              >
                Reject
              </button>
            </span>
          );
        }
        if (row.status === "confirmed") {
          return (
            <button
              type="button"
              onClick={() => onMarkSaid(row)}
              disabled={saving || busy}
              className="admin-table__action disabled:opacity-45"
            >
              {saving ? "Saving…" : "Mark Said"}
            </button>
          );
        }
        return <span className="text-admin-ink-muted">—</span>;
      },
    },
  ];

  const showToolbar = canDecide || confirmed.length > 0;

  return (
    <AdminCard className={`overflow-hidden ${isPast ? "opacity-80" : ""}`}>
      <header
        className={`flex flex-wrap items-start justify-between gap-3 border-b border-admin-border px-4 py-3.5 ${
          isPast ? "bg-admin-surface-alt" : ""
        }`}
      >
        <div className="min-w-0">
          <h2 className={`font-serif text-admin-group font-semibold ${isPast ? "text-admin-ink-muted" : "text-admin-ink"}`}>
            {slot.time}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-admin-support text-admin-ink-muted">
              {isPast
                ? `${slot.bookedCount} ${slot.bookedCount === 1 ? "intention" : "intentions"} offered`
                : slot.maxIntentions === null
                  ? `${slot.bookedCount} ${slot.bookedCount === 1 ? "intention" : "intentions"}`
                  : `${slot.bookedCount} of ${slot.maxIntentions} intention slots filled`}
            </p>
            {isPast ? (
              <AdminBadge tone="muted">Past Mass</AdminBadge>
            ) : (
              <CapacityBadge state={slot.capacityState} remaining={slot.remaining} />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={onPrint}
            disabled={printable.length === 0}
            title={printable.length === 0 ? "Only confirmed intentions are printed" : undefined}
          >
            Print
          </AdminButton>
          {!isPast && (
            <AdminButton type="button" size="sm" onClick={onAddRequest} disabled={slot.remaining === 0}>
              {slot.remaining === 0 ? "Slot full" : "Add request"}
            </AdminButton>
          )}
        </div>
      </header>
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border bg-admin-surface-alt px-4 py-2.5">
          {canDecide ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-1 flex cursor-pointer items-center gap-2 text-admin-support text-admin-ink">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={busy}
                  className="h-4 w-4 accent-admin-green-700"
                />
                {allSelected ? "Unselect all" : `Select all requests (${pending.length})`}
              </label>
              <AdminButton
                type="button"
                size="sm"
                disabled={busy || selectedRows.length === 0}
                onClick={() => onConfirmMany(selectedRows)}
              >
                Confirm {selectedRows.length > 0 ? selectedRows.length : ""}
              </AdminButton>
              <AdminButton
                type="button"
                variant="danger"
                size="sm"
                disabled={busy || selectedRows.length === 0}
                onClick={() => onRejectMany(selectedRows)}
              >
                Reject {selectedRows.length > 0 ? selectedRows.length : ""}
              </AdminButton>
            </div>
          ) : (
            <span />
          )}
          {confirmed.length > 0 && (
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => onMarkSaidMany(confirmed)}
            >
              {busy ? "Saving…" : `Mark all confirmed as said (${confirmed.length})`}
            </AdminButton>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <AdminTable
          columns={columns}
          rows={slot.intentions}
          getRowKey={(row) => row.id}
          emptyMessage={isPast ? "No intentions were offered at this Mass." : "No requests for this Mass yet."}
        />
      </div>
      {slot.intentions.length > 0 && (
        <p className="border-t border-admin-border px-4 py-2.5 text-right text-admin-support text-admin-ink-muted">
          Donations received{" "}
          <span className="font-semibold tabular-nums text-admin-ink">{formatPeso(totalDonations)}</span>
        </p>
      )}
    </AdminCard>
  );
}
