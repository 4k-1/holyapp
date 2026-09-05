import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AdminInput } from "@/features/parish-admin/components/AdminForm";
import {
  getMassIntentionCapacity,
  listAdminMassSlots,
  markIntentionSaid,
  updateMassIntentionCapacity,
} from "@/features/parish-admin/intentions/api/intentionsAdminApi";
import { BookIntentionModal } from "@/features/parish-admin/intentions/components/BookIntentionModal";
import { MassCapacitySetting } from "@/features/parish-admin/intentions/components/MassCapacitySetting";
import { MassSlotPicker } from "@/features/parish-admin/intentions/components/MassSlotPicker";
import { MassSlotTable } from "@/features/parish-admin/intentions/components/MassSlotTable";
import { formatPeso, offeringTotal, todayISO } from "@/features/parish-admin/intentions/intentionsHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { MassIntentionRequest, MassSlotView, Parish } from "@/types";

/** View + book: parish_admin and parish_staff via requireRole on this route. Parishioner cannot confirm a slot. */

const LOCATION = "Main church";

export function AdminMassIntentionsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const today = todayISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [bookingSlot, setBookingSlot] = useState<MassSlotView | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [pickedSlotId, setPickedSlotId] = useState<string | null>(null);

  const rangeFrom = from || today;
  const rangeTo = !to ? rangeFrom : to < rangeFrom ? rangeFrom : to;
  const isToday = rangeFrom === today && rangeTo === today;
  const singleDay = rangeFrom === rangeTo;

  const { data: slots = [], loading, refetch } = useAsync(
    () =>
      listAdminMassSlots(parish.id, {
        from: rangeFrom,
        to: rangeTo,
        location: LOCATION,
      }),
    [parish.id, rangeFrom, rangeTo]
  );

  const { data: capacity = 5, refetch: refetchCapacity } = useAsync(() => getMassIntentionCapacity(), []);

  async function handleCapacitySave(next: number) {
    await updateMassIntentionCapacity(next);
    refetchCapacity();
    refetch();
  }

  const totals = useMemo(() => {
    const intentions = slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
    const offering = slots.reduce((sum, slot) => sum + offeringTotal(slot.intentions), 0);
    return { intentions, offering, masses: slots.length };
  }, [slots]);

  // Falls back to the first Mass in the current range whenever the picked one isn't in view
  // (first load, or the date range changed out from under it).
  const selectedSlotId = pickedSlotId && slots.some((s) => s.id === pickedSlotId) ? pickedSlotId : slots[0]?.id ?? null;
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  function goToToday() {
    setFrom(today);
    setTo(today);
  }

  async function handleMarkSaid(intention: MassIntentionRequest) {
    setMarkingId(intention.id);
    try {
      await markIntentionSaid(intention.id);
      refetch();
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-serif text-admin-page font-semibold text-admin-ink">Mass Intentions</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Online intention requests against scheduled Masses. Every Mass shares the same intention capacity.
          </p>
          {!loading && slots.length > 0 && (
            <p className="mt-2 text-admin-support text-admin-ink-muted">
              <span className="font-semibold tabular-nums text-admin-ink">{totals.intentions}</span>{" "}
              {totals.intentions === 1 ? "intention" : "intentions"} ·{" "}
              <span className="font-semibold tabular-nums text-admin-ink">{totals.masses}</span>{" "}
              {totals.masses === 1 ? "Mass" : "Masses"} · Total offering{" "}
              <span className="font-semibold tabular-nums text-admin-ink">{formatPeso(totals.offering)}</span>
            </p>
          )}
        </div>
        <MassCapacitySetting capacity={capacity} onSave={handleCapacitySave} />
      </div>

      <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div role="group" aria-label="Date range shortcuts">
          <PresetButton label="Today" active={isToday} onClick={goToToday} />
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="block">
            <span className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
              From
            </span>
            <AdminInput
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className="!w-full sm:!w-auto"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
              To
            </span>
            <AdminInput
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className="!w-full sm:!w-auto"
            />
          </label>
        </div>
      </div>

      {loading && slots.length === 0 ? (
        <p className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">Loading Mass slots…</p>
      ) : slots.length === 0 ? (
        <p className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">
          {singleDay ? "No Masses scheduled for this date." : "No Masses scheduled in this date range."}
        </p>
      ) : singleDay ? (
        <div className="flex flex-col gap-4">
          {slots.map((slot) => (
            <MassSlotTable
              key={slot.id}
              slot={slot}
              markingId={markingId}
              onAddRequest={() => setBookingSlot(slot)}
              onMarkSaid={handleMarkSaid}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="lg:w-[320px] lg:flex-shrink-0">
            <MassSlotPicker slots={slots} selectedId={selectedSlotId} onSelect={(slot) => setPickedSlotId(slot.id)} />
          </div>
          <div className="min-w-0 flex-1">
            {selectedSlot ? (
              <MassSlotTable
                slot={selectedSlot}
                markingId={markingId}
                onAddRequest={() => setBookingSlot(selectedSlot)}
                onMarkSaid={handleMarkSaid}
              />
            ) : (
              <p className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">
                Select a Mass to view its intentions.
              </p>
            )}
          </div>
        </div>
      )}

      {bookingSlot && (
        <BookIntentionModal
          parishId={parish.id}
          slot={bookingSlot}
          onClose={() => setBookingSlot(null)}
          onBooked={() => {
            setBookingSlot(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function PresetButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[7px] border px-3 py-1.5 text-admin-support font-semibold transition-colors ${
        active
          ? "border-admin-green-700 bg-admin-green-050 text-admin-green-900"
          : "border-admin-border-strong bg-white text-admin-ink-muted hover:border-admin-green-600"
      }`}
    >
      {label}
    </button>
  );
}
