// src/features/parish-admin/settings/components/ServiceFeesSection.tsx
import { useEffect, useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { listServiceFees, updateServiceFeeAmount } from "../api/feesApi";
import { EditServiceFeeModal } from "./EditServiceFeeModal";
import type { ServiceFee } from "../types";

export function ServiceFeesSection() {
  const [fees, setFees] = useState<ServiceFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFee, setEditingFee] = useState<ServiceFee | null>(null);

  useEffect(() => {
    listServiceFees()
      .then(setFees)
      .catch((err: unknown) => {
        window.alert(err instanceof Error ? err.message : "Could not load service fees.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(amount: number) {
    if (!editingFee) return;
    try {
      const updated = await updateServiceFeeAmount(editingFee.id, amount);
      setFees((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setEditingFee(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not update fee.");
    }
  }

  if (loading) {
    return <p className="text-admin-body text-admin-ink-muted">Loading…</p>;
  }

  return (
    <>
      <AdminCard className="p-5 px-[22px]">
        <h2 className="mb-1 font-serif text-admin-section font-semibold text-admin-ink">Service Fees</h2>
        <p className="mb-5 text-admin-support text-admin-ink-muted">
          These amounts auto-apply to all future requests of that type — changing one here doesn't affect requests already
          submitted.
        </p>

        <table className="w-full text-left text-admin-body">
          <thead>
            <tr className="border-b border-admin-border text-admin-label font-semibold uppercase tracking-wide text-admin-ink-muted">
              <th className="py-2.5">Service</th>
              <th className="py-2.5">Default fee</th>
              <th className="py-2.5">Last updated</th>
              <th className="py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id} className="border-b border-admin-border last:border-b-0">
                <td className="py-3 text-admin-ink">{fee.label}</td>
                <td className="py-3">
                  <span className="font-semibold text-admin-ink">₱{fee.amount}</span>
                </td>
                <td className="py-3 text-admin-support text-admin-ink-faint">
                  Last updated by {fee.updatedBy} on {fee.updatedOn}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => setEditingFee(fee)}
                    className="text-admin-support font-semibold text-admin-green-700 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>

      {editingFee && (
        <EditServiceFeeModal fee={editingFee} onClose={() => setEditingFee(null)} onSave={handleSave} />
      )}
    </>
  );
}
