import { useState, type FormEvent } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton, AdminField, AdminInput, AdminSelect, AdminTextarea } from "@/features/parish-admin/components/AdminForm";
import { bookSlotIntention } from "@/features/parish-admin/intentions/api/intentionsAdminApi";
import { formatMassDate } from "@/features/parish-admin/intentions/intentionsHelpers";
import { MASS_INTENTION_TYPES, type MassSlotView } from "@/types";

interface BookIntentionModalProps {
  parishId: string;
  slot: MassSlotView;
  onClose: () => void;
  onBooked: () => void;
}

export function BookIntentionModal({ parishId, slot, onClose, onBooked }: BookIntentionModalProps) {
  const [requesterName, setRequesterName] = useState("");
  const [contact, setContact] = useState("");
  const [intentionType, setIntentionType] = useState<string>(MASS_INTENTION_TYPES[0]);
  const [intentionText, setIntentionText] = useState("");
  const [offering, setOffering] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const full = slot.remaining <= 0;
  const offeringAmount = Number(offering);
  const canSave = Boolean(
    !full &&
      requesterName.trim() &&
      intentionText.trim() &&
      Number.isFinite(offeringAmount) &&
      offeringAmount >= 0 &&
      !submitting
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSubmitting(true);
    setError("");
    try {
      await bookSlotIntention(parishId, slot, {
        requesterName: requesterName.trim(),
        intentionType,
        intentionText: intentionText.trim(),
        contact: contact.trim(),
        offering: offeringAmount,
      });
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminDialog onClose={onClose} busy={submitting} panelClassName="max-w-[520px]">
      <AdminDialogHeader
        title="Add request"
        subtitle={`${formatMassDate(slot.date)} · ${slot.time} · ${slot.location}`}
        onClose={onClose}
        busy={submitting}
      />
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {full ? (
            <p className="mb-4 rounded-[9px] border border-[#E3C3BC] bg-admin-red-100 px-3.5 py-2.5 text-admin-support text-admin-red-700">
              This Mass is at full capacity. Choose another slot.
            </p>
          ) : (
            <p className="mb-4 text-admin-support text-admin-ink-muted">
              {slot.remaining} of {slot.maxIntentions} places remaining on this Mass.
            </p>
          )}

          <AdminField label="Requester name">
            <AdminInput
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Name of the person offering"
              required
              disabled={full}
            />
          </AdminField>
          <AdminField label="Contact">
            <AdminInput
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Mobile number or email"
              disabled={full}
            />
          </AdminField>
          <AdminField label="Intention type">
            <AdminSelect
              value={intentionType}
              onChange={(e) => setIntentionType(e.target.value)}
              disabled={full}
            >
              {MASS_INTENTION_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label="Offering (₱)">
            <AdminInput
              type="number"
              min={0}
              step="1"
              value={offering}
              onChange={(e) => setOffering(e.target.value)}
              disabled={full}
            />
          </AdminField>
          <AdminField label="Intention" className="mb-0">
            <AdminTextarea
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              placeholder="For the soul of… / Thanksgiving for…"
              required
              disabled={full}
            />
          </AdminField>

          {error && (
            <p className="mt-3 rounded-[9px] border border-[#E3C3BC] bg-admin-red-100 px-3.5 py-2.5 text-admin-support text-admin-red-700">
              {error}
            </p>
          )}
        </div>
        <AdminDialogFooter>
          <AdminButton variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={!canSave}>
            {submitting ? "Adding…" : "Add request"}
          </AdminButton>
        </AdminDialogFooter>
      </form>
    </AdminDialog>
  );
}
