// src/features/parish-admin/settings/components/ServiceFeesSection.tsx
import { useEffect, useState } from "react";
import { listServiceFees, updateServiceFeeAmount } from "../api/feesApi";
import { EditServiceFeeModal } from "./EditServiceFeeModal";
import type { ServiceFee } from "../types";
import { notifyError } from "@/lib/notify";
import { SkeletonList } from "@/components/ui/Skeleton";
import { SettingsPanel, SettingsPillButton } from "./SettingsUI";

export function ServiceFeesSection() {
  const [fees, setFees] = useState<ServiceFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFee, setEditingFee] = useState<ServiceFee | null>(null);

  useEffect(() => {
    listServiceFees()
      .then(setFees)
      .catch((err: unknown) => {
        notifyError(err, "Could not load service fees.");
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
      notifyError(err, "Could not update fee.");
    }
  }

  if (loading) {
    return <SkeletonList rows={4} className="px-0" />;
  }

  return (
    <>
      <SettingsPanel
        title="Default fees"
        description="Each amount is applied automatically to new requests of that type."
        flush
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-admin-body">
            <thead>
              <tr className="border-b border-admin-border bg-admin-surface-alt text-[0.75rem] font-medium text-admin-ink-muted">
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Default fee</th>
                <th className="px-5 py-3">Last updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id} className="border-b border-admin-border last:border-b-0">
                  <td className="px-5 py-3 text-admin-ink">{fee.label}</td>
                  <td className="px-5 py-3">
                    <span className="font-semibold tabular-nums text-admin-ink">₱{fee.amount.toLocaleString("en-PH")}</span>
                  </td>
                  <td className="px-5 py-3 text-admin-support text-admin-ink-faint">
                    {fee.updatedBy} · {fee.updatedOn}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <SettingsPillButton onClick={() => setEditingFee(fee)} aria-label={`Edit ${fee.label} fee`}>
                      Edit
                    </SettingsPillButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsPanel>

      {editingFee && (
        <EditServiceFeeModal fee={editingFee} onClose={() => setEditingFee(null)} onSave={handleSave} />
      )}
    </>
  );
}
