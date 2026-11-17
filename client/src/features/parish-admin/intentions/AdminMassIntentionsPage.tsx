import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { usePrintJob } from "@/components/print/usePrintJob";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import {
  confirmIntention,
  getMassIntentionCapacity,
  listAdminMassSlots,
  markIntentionSaid,
  rejectIntention,
  updateMassIntentionCapacity,
} from "@/features/parish-admin/intentions/api/intentionsAdminApi";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { BookIntentionModal } from "@/features/parish-admin/intentions/components/BookIntentionModal";
import { IntentionsPrintSheet } from "@/features/parish-admin/intentions/components/IntentionsPrintSheet";
import { markIntentionsPrinted } from "@/features/parish-admin/intentions/printedLists";
import { MassCapacitySetting } from "@/features/parish-admin/intentions/components/MassCapacitySetting";
import { MassIntentionsMiniCalendar } from "@/features/parish-admin/intentions/components/MassIntentionsMiniCalendar";
import { MassSlotTable } from "@/features/parish-admin/intentions/components/MassSlotTable";
import { donationTotal, formatMassDate, formatPeso, printableIntentions, todayISO } from "@/features/parish-admin/intentions/intentionsHelpers";
import { daysInMonth, toISO } from "@/features/parish-admin/schedule/scheduleHelpers";
import { useAsync } from "@/hooks/useAsync";
import { askConfirm, notify, notifyError } from "@/lib/notify";
import type { MassIntentionRequest, MassSlotView, Parish } from "@/types";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";

/** View + book: parish_admin and parish_staff via requireRole on this route. Parishioner cannot confirm a slot. */

const LOCATION = "Main church";

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

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
  /** The Mass whose bulk confirm / reject / said is saving. */
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  /** The Masses being printed; the sheet renders, the browser prints, then this clears. */
  const [printing, setPrinting] = usePrintJob<MassSlotView[]>();

  /** Print these Masses' lists, and remember it so the dashboard can tick the task off. */
  function printSlots(list: MassSlotView[]) {
    markIntentionsPrinted(list.filter((slot) => printableIntentions(slot.intentions).length > 0));
    setPrinting(list);
  }

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

  const { data: capacityData, refetch: refetchCapacity } = useAsync(() => getMassIntentionCapacity(), []);
  const capacity = capacityData === undefined ? 5 : capacityData;

  async function handleCapacitySave(next: number | null) {
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
    const donations = slots.reduce((sum, slot) => sum + donationTotal(slot.intentions), 0);
    return { intentions, donations, masses: slots.length };
  }, [slots]);

  const daySlots = slotsByDate[selectedDate] ?? [];
  const dayBooked = daySlots.reduce((sum, slot) => sum + slot.bookedCount, 0);
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

  async function handleReject(intention: MassIntentionRequest) {
    const ok = await askConfirm({
      title: "Reject this request?",
      message: `${intention.intentionFor} will not be offered at this Mass, and the person who asked will be told.`,
      confirmLabel: "Reject",
      danger: true,
    });
    if (!ok) return;
    setMarkingId(intention.id);
    try {
      await rejectIntention(intention.id);
      refetch();
    } catch (err) {
      notifyError(err, "Couldn't reject the request.");
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

  /** Runs one action on several intentions of a Mass, one at a time, then reports how it went. */
  async function runMany(
    slot: MassSlotView,
    intentions: MassIntentionRequest[],
    action: (id: string) => Promise<unknown>,
    done: string
  ) {
    setBusySlotId(slot.id);
    let failed = 0;
    for (const intention of intentions) {
      try {
        await action(intention.id);
      } catch {
        failed += 1;
      }
    }
    setBusySlotId(null);
    refetch();
    const succeeded = intentions.length - failed;
    if (failed === 0) notify(`${plural(succeeded, "intention")} ${done}.`);
    else notify(`${succeeded} of ${intentions.length} ${done}; ${failed} couldn't be saved. Please try again.`, "error");
  }

  async function handleConfirmMany(slot: MassSlotView, intentions: MassIntentionRequest[]) {
    await runMany(slot, intentions, confirmIntention, "confirmed");
  }

  async function handleRejectMany(slot: MassSlotView, intentions: MassIntentionRequest[]) {
    const ok = await askConfirm({
      title: `Reject ${plural(intentions.length, "request")}?`,
      message: `They will not be offered at the ${slot.time} Mass, and each person who asked will be told.`,
      confirmLabel: "Reject",
      danger: true,
    });
    if (!ok) return;
    await runMany(slot, intentions, rejectIntention, "rejected");
  }

  async function handleMarkSaidMany(slot: MassSlotView, intentions: MassIntentionRequest[]) {
    const ok = await askConfirm({
      title: `Mark ${plural(intentions.length, "intention")} as said?`,
      message: `Every confirmed intention for the ${slot.time} Mass will be marked as offered, and each person who asked will be told.`,
      confirmLabel: "Mark said",
    });
    if (!ok) return;
    await runMany(slot, intentions, markIntentionSaid, "marked as said");
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Mass Intentions"
        description="Intentions requested for each Mass. Pick a day to see its Masses; donations are optional."
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <MassIntentionsMiniCalendar
            cursor={cursor}
            slotsByDate={slotsByDate}
            loading={loading}
            selectedDate={selectedDate}
            todayStr={today}
            onSelectDate={setSelectedDate}
            onPrevMonth={() => shiftMonth(-1)}
            onNextMonth={() => shiftMonth(1)}
            onToday={goToToday}
          />
          <div className="grid grid-cols-2 gap-3" aria-label={`${monthLabel} totals`}>
            <AdminStatCard
              label={`Intentions in ${cursor.toLocaleDateString("en-US", { month: "long" })}`}
              value={loading && slots.length === 0 ? "—" : totals.intentions}
            />
            <AdminStatCard
              label="Donations received"
              value={loading && slots.length === 0 ? "—" : formatPeso(totals.donations)}
            />
          </div>
          <MassCapacitySetting capacity={capacity} onSave={handleCapacitySave} />
        </aside>

      <section className="min-w-0" aria-live="polite">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-admin-section font-semibold text-admin-ink">{formatMassDate(selectedDate)}</h2>
          {daySlots.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-admin-body text-admin-ink-muted">
                {selectedIsPast
                  ? `${plural(dayBooked, "intention")} offered`
                  : daySlots.some((slot) => slot.remaining === null)
                    ? plural(dayBooked, "intention")
                    : `${daySlots.reduce((sum, slot) => sum + (slot.remaining ?? 0), 0)} places left`}{" "}
                · {daySlots.length} {daySlots.length === 1 ? "Mass" : "Masses"}
              </p>
              {daySlots.length > 1 && (
                <AdminButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => printSlots(daySlots)}
                  disabled={daySlots.every((slot) => printableIntentions(slot.intentions).length === 0)}
                >
                  Print all Masses
                </AdminButton>
              )}
            </div>
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
                busy={busySlotId === slot.id}
                isPast={selectedIsPast}
                onAddRequest={() => setBookingSlot(slot)}
                onPrint={() => printSlots([slot])}
                onConfirm={handleConfirm}
                onReject={handleReject}
                onMarkSaid={handleMarkSaid}
                onConfirmMany={(list) => handleConfirmMany(slot, list)}
                onRejectMany={(list) => handleRejectMany(slot, list)}
                onMarkSaidMany={(list) => handleMarkSaidMany(slot, list)}
              />
            ))}
          </div>
        )}
      </section>
      </div>

      {printing && (
        <IntentionsPrintSheet
          parishName={parish.name}
          date={selectedDate}
          slots={printing.filter((slot) => printableIntentions(slot.intentions).length > 0)}
        />
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
    </AdminPage>
  );
}
