import { useMemo } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { CapacityBadge } from "@/features/parish-admin/intentions/components/CapacityBadge";
import {
  formatPeso,
  formatRequestedOn,
  formatSlotHeading,
  intentionLabel,
  donationTotal,
} from "@/features/parish-admin/intentions/intentionsHelpers";
import type { MassIntentionRequest, MassIntentionStatus, MassSlotView } from "@/types";

interface MassSlotTableProps {
  slot: MassSlotView;
  markingId: string | null;
  /** The Mass has already been celebrated: no new requests or confirmations, only catching up on "Said". */
  isPast?: boolean;
  onAddRequest: () => void;
  onConfirm: (intention: MassIntentionRequest) => void;
  onMarkSaid: (intention: MassIntentionRequest) => void;
}

const STATUS_TONE: Record<MassIntentionStatus, "amber" | "green" | "muted"> = {
  pending: "amber",
  confirmed: "green",
  said: "muted",
};

const STATUS_LABEL: Record<MassIntentionStatus, string> = {
  pending: "Request",
  confirmed: "Confirmed",
  said: "Said",
};

export function MassSlotTable({
  slot,
  markingId,
  isPast = false,
  onAddRequest,
  onConfirm,
  onMarkSaid,
}: MassSlotTableProps) {
  const totalDonations = useMemo(() => donationTotal(slot.intentions), [slot.intentions]);

  const columns: AdminTableColumn<MassIntentionRequest>[] = [
    {
      key: "intention",
      header: "Intention",
      render: (row) => (
        <span>
          <span className="block text-admin-ink">{intentionLabel(row)}</span>
          <span className="block text-admin-support text-admin-ink-muted">
            {row.requestedBy} · {formatRequestedOn(row.createdAt)}
          </span>
        </span>
      ),
    },
    {
      key: "donation",
      header: "Donation",
      render: (row) =>
        row.payment === "none" ? (
          <span className="text-admin-ink-muted">None</span>
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
      render: (row) => <AdminBadge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</AdminBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) =>
        row.status === "pending" && !isPast ? (
          <button
            type="button"
            onClick={() => onConfirm(row)}
            disabled={markingId === row.id}
            className="font-semibold text-admin-green-700 hover:underline disabled:opacity-45"
          >
            {markingId === row.id ? "Saving…" : "Confirm"}
          </button>
        ) : row.status === "confirmed" ? (
          <button
            type="button"
            onClick={() => onMarkSaid(row)}
            disabled={markingId === row.id}
            className="font-semibold text-admin-green-700 hover:underline disabled:opacity-45"
          >
            {markingId === row.id ? "Saving…" : "Mark Said"}
          </button>
        ) : (
          <span className="text-admin-ink-muted">—</span>
        ),
    },
  ];

  return (
    <AdminCard className={`overflow-hidden ${isPast ? "opacity-80" : ""}`}>
      <header
        className={`flex flex-wrap items-start justify-between gap-3 border-b border-admin-border px-4 py-3.5 ${
          isPast ? "bg-admin-surface-alt" : ""
        }`}
      >
        <div className="min-w-0">
          <h2 className={`font-serif text-admin-group font-semibold ${isPast ? "text-admin-ink-muted" : "text-admin-ink"}`}>
            {formatSlotHeading(slot.date, slot.time)}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-admin-support text-admin-ink-muted">
              {isPast
                ? `${slot.bookedCount} ${slot.bookedCount === 1 ? "intention" : "intentions"} offered`
                : `${slot.bookedCount} of ${slot.maxIntentions} intention slots filled`}
            </p>
            {isPast ? (
              <AdminBadge tone="muted">Past Mass</AdminBadge>
            ) : (
              <CapacityBadge state={slot.capacityState} remaining={slot.remaining} />
            )}
          </div>
        </div>
        {!isPast && (
          <div className="flex flex-wrap items-center gap-3">
            <AdminButton type="button" size="sm" onClick={onAddRequest} disabled={slot.remaining <= 0}>
              {slot.remaining <= 0 ? "Slot full" : "Add request"}
            </AdminButton>
          </div>
        )}
      </header>
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
