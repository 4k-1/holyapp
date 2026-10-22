import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import {
  confirmIntention,
  getMassIntentionCapacity,
  listAdminMassSlots,
  markIntentionSaid,
  updateMassIntentionCapacity,
} from "@/features/parish-admin/intentions/api/intentionsAdminApi";
import { BookIntentionModal } from "@/features/parish-admin/intentions/components/BookIntentionModal";
import { MassCapacitySetting } from "@/features/parish-admin/intentions/components/MassCapacitySetting";
import { MassIntentionsMonthGrid } from "@/features/parish-admin/intentions/components/MassIntentionsMonthGrid";
import { MassSlotTable } from "@/features/parish-admin/intentions/components/MassSlotTable";
import { formatMassDate, formatPeso, offeringTotal, todayISO } from "@/features/parish-admin/intentions/intentionsHelpers";
import { daysInMonth, toISO } from "@/features/parish-admin/schedule/scheduleHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { MassIntentionRequest, MassSlotView, Parish } from "@/types";

/** View + book: parish_admin and parish_staff via requireRole on this route. Parishioner cannot confirm a slot. */

const LOCATION = "Main church";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function AdminMassIntentionsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const today = todayISO();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [bookingSlot, setBookingSlot] = useState<MassSlotView | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const monthFrom = toISO(cursor);
  const monthTo = toISO(new Date(cursor.getFullYear(), cursor.getMonth(), daysInMonth(cursor.getFullYear(), cursor.getMonth())));
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const { data: slots = [], loading, refetch } = useAsync(
    () =>
      listAdminMassSlots(parish.id, {
        from: monthFrom,
        to: monthTo,
        location: LOCATION,
      }),
    [parish.id, monthFrom, monthTo]
  );

  const { data: capacity = 5, refetch: refetchCapacity } = useAsync(() => getMassIntentionCapacity(), []);

  async function handleCapacitySave(next: number) {
    await updateMassIntentionCapacity(next);
    refetchCapacity();
    refetch();
  }

  const slotsByDate = useMemo(() => {
    const byDate: Record<string, MassSlotView[]> = {};
    for (const slot of slots) (byDate[slot.date] ??= []).push(slot);
    return byDate;
  }, [slots]);

  const totals = useMemo(() => {
    const intentions = slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
    const offering = slots.reduce((sum, slot) => sum + offeringTotal(slot.intentions), 0);
    return { intentions, offering, masses: slots.length };
  }, [slots]);

  const daySlots = slotsByDate[selectedDate] ?? [];
  const selectedIsPast = selectedDate < today;

  function shiftMonth(dir: number) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
    setCursor(next);
    const sameMonthAsToday = next.getFullYear() === new Date().getFullYear() && next.getMonth() === new Date().getMonth();
    setSelectedDate(sameMonthAsToday ? today : toISO(next));
  }

  function goToToday() {
    setCursor(startOfMonth(new Date()));
    setSelectedDate(today);
  }

  async function handleConfirm(intention: MassIntentionRequest) {
    setMarkingId(intention.id);
    try {
      await confirmIntention(intention.id);
      refetch();
    } finally {
      setMarkingId(null);
    }
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
              {monthLabel} ·{" "}
              <span className="font-semibold tabular-nums text-admin-ink">{totals.intentions}</span>{" "}
              {totals.intentions === 1 ? "intention" : "intentions"} across{" "}
              <span className="font-semibold tabular-nums text-admin-ink">{totals.masses}</span>{" "}
              {totals.masses === 1 ? "Mass" : "Masses"} · Total offering{" "}
              <span className="font-semibold tabular-nums text-admin-ink">{formatPeso(totals.offering)}</span>
            </p>
          )}
        </div>
        <MassCapacitySetting capacity={capacity} onSave={handleCapacitySave} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-surface text-admin-ink-muted hover:bg-admin-surface-alt"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="min-w-[140px] text-center font-serif text-admin-group font-semibold text-admin-ink">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-surface text-admin-ink-muted hover:bg-admin-surface-alt"
          aria-label="Next month"
        >
          ›
        </button>
        <AdminButton variant="secondary" size="sm" onClick={goToToday}>
          Today
        </AdminButton>
      </div>

      <MassIntentionsMonthGrid
        cursor={cursor}
        slotsByDate={slotsByDate}
        loading={loading}
        selectedDate={selectedDate}
        todayStr={today}
        onSelectDate={setSelectedDate}
      />

      <section className="mt-6" aria-live="polite">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-admin-group font-semibold text-admin-ink">{formatMassDate(selectedDate)}</h2>
          {daySlots.length > 0 && (
            <p className="text-admin-support text-admin-ink-muted">
              {selectedIsPast
                ? `${daySlots.reduce((sum, slot) => sum + slot.bookedCount, 0)} intentions offered`
                : `${daySlots.reduce((sum, slot) => sum + slot.remaining, 0)} places left`}{" "}
              · {daySlots.length} {daySlots.length === 1 ? "Mass" : "Masses"}
            </p>
          )}
        </div>
        {loading && daySlots.length === 0 ? (
          <p className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">Loading Mass slots…</p>
        ) : daySlots.length === 0 ? (
          <p className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">No Masses scheduled for this date.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {daySlots.map((slot) => (
              <MassSlotTable
                key={slot.id}
                slot={slot}
                markingId={markingId}
                isPast={selectedIsPast}
                onAddRequest={() => setBookingSlot(slot)}
                onConfirm={handleConfirm}
                onMarkSaid={handleMarkSaid}
              />
            ))}
          </div>
        )}
      </section>

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
