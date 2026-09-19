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
  offeringTotal,
} from "@/features/parish-admin/intentions/intentionsHelpers";
import type { MassIntentionRequest, MassIntentionStatus, MassSlotView } from "@/types";

interface MassSlotTableProps {
  slot: MassSlotView;
  markingId: string | null;
  onAddRequest: () => void;
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
  onAddRequest,
  onMarkSaid,
}: MassSlotTableProps) {
  const totalOffering = useMemo(() => offeringTotal(slot.intentions), [slot.intentions]);

  const columns: AdminTableColumn<MassIntentionRequest>[] = [
    {
      key: "requestedBy",
      header: "Requested by",
      render: (row) => <span className="font-medium text-admin-ink">{row.requestedBy}</span>,
    },
    {
      key: "intention",
      header: "Intention",
      render: (row) => intentionLabel(row),
    },
    {
      key: "requestedOn",
      header: "Requested on",
      render: (row) => (
        <span className="whitespace-nowrap text-admin-ink-muted">{formatRequestedOn(row.createdAt)}</span>
      ),
    },
    {
      key: "offering",
      header: "Offering",
      render: (row) => <span className="tabular-nums whitespace-nowrap">{formatPeso(row.offering)}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (row) => (
        <AdminBadge tone={row.payment === "paid" ? "green" : "amber"}>
          {row.payment === "paid" ? "Paid" : "Unpaid"}
        </AdminBadge>
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
        row.status === "confirmed" ? (
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
    <AdminCard className="overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-admin-border px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="font-serif text-admin-group font-semibold text-admin-ink">
            {formatSlotHeading(slot.date, slot.time)}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-admin-support text-admin-ink-muted">
              {slot.bookedCount} of {slot.maxIntentions} intention slots filled
            </p>
            <CapacityBadge state={slot.capacityState} remaining={slot.remaining} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminButton type="button" size="sm" onClick={onAddRequest} disabled={slot.remaining <= 0}>
            {slot.remaining <= 0 ? "Slot full" : "Add request"}
          </AdminButton>
        </div>
      </header>
      <div className="overflow-x-auto">
        <AdminTable
          columns={columns}
          rows={slot.intentions}
          getRowKey={(row) => row.id}
          emptyMessage="No requests for this Mass yet."
        />
      </div>
      {slot.intentions.length > 0 && (
        <p className="border-t border-admin-border px-4 py-2.5 text-right text-admin-support text-admin-ink-muted">
          Total offering{" "}
          <span className="font-semibold tabular-nums text-admin-ink">{formatPeso(totalOffering)}</span>
        </p>
      )}
    </AdminCard>
  );
}
