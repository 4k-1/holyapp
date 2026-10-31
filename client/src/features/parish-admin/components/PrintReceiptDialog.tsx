import { useState, type FormEvent } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { ReceiptSheet, type ReceiptData } from "@/components/print/ReceiptSheet";
import { usePrintJob } from "@/components/print/usePrintJob";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";

interface PrintReceiptDialogProps {
  parish: { name: string; address?: string; contact?: string };
  /** Everything except who paid; staff confirm that here, since it's often not the person on the record. */
  receipt: Omit<ReceiptData, "receivedFrom">;
  defaultReceivedFrom: string;
  onClose: () => void;
}

/** Confirms who handed over the money, then prints a two-copy receipt. */
export function PrintReceiptDialog({ parish, receipt, defaultReceivedFrom, onClose }: PrintReceiptDialogProps) {
  const [receivedFrom, setReceivedFrom] = useState(defaultReceivedFrom);
  const [job, startJob] = usePrintJob<ReceiptData>();

  function handlePrint(e: FormEvent) {
    e.preventDefault();
    startJob({ ...receipt, receivedFrom: receivedFrom.trim() });
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      layer="z-[70]"
      panelClassName="max-w-[420px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <form onSubmit={handlePrint}>
        <div className="border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">
            Print receipt
          </h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            No. {receipt.number} · ₱{receipt.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="px-6 py-5">
          <AdminField label="Received from" className="mb-0">
            <AdminInput
              value={receivedFrom}
              onChange={(e) => setReceivedFrom(e.target.value)}
              placeholder="Name of the person who paid"
              autoFocus
            />
          </AdminField>
          <p className="mt-2 text-admin-support text-admin-ink-muted">
            Prints two copies on one page: one to hand over, one for the parish.
          </p>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton type="button" variant="secondary" onClick={onClose}>
            Close
          </AdminButton>
          <AdminButton type="submit">Print receipt</AdminButton>
        </div>
      </form>
      {job && <ReceiptSheet parish={parish} receipt={job} />}
    </AdminModalFrame>
  );
}
