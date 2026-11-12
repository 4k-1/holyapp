import { PrintSheet } from "@/components/print/PrintSheet";
import { MASS_INTENTION_TYPES, type MassIntentionRequest, type MassSlotView } from "@/types";
import { formatMassDate } from "@/features/parish-admin/intentions/intentionsHelpers";
import "./intentionsPrint.css";

interface IntentionsPrintSheetProps {
  parishName: string;
  date: string;
  /** One Mass, or every Mass of the day. */
  slots: MassSlotView[];
}

/** Groups intentions by reason in the usual order, with anything unrecognised last. */
function byReason(intentions: MassIntentionRequest[]) {
  const order: string[] = [...MASS_INTENTION_TYPES];
  const groups = new Map<string, MassIntentionRequest[]>();
  for (const intention of intentions) {
    const key = intention.intentionType || "Other";
    groups.set(key, [...(groups.get(key) ?? []), intention]);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
  });
}

/**
 * The list the priest reads at Mass, printed on its own with nothing from the admin screen around it.
 */
export function IntentionsPrintSheet({ parishName, date, slots }: IntentionsPrintSheetProps) {
  return (
    <PrintSheet className="intentions-print-sheet">
      {slots.map((slot) => (
        <section key={slot.id} className="intentions-print-sheet__mass">
          <p className="intentions-print-sheet__parish">{parishName}</p>
          <h1 className="intentions-print-sheet__title">Mass Intentions</h1>
          <p className="intentions-print-sheet__when">
            {formatMassDate(date)} · {slot.time}
          </p>

          {slot.intentions.length === 0 ? (
            <p className="intentions-print-sheet__empty">No intentions for this Mass.</p>
          ) : (
            byReason(slot.intentions).map(([reason, items]) => (
              <div key={reason} className="intentions-print-sheet__group">
                <h2>{reason}</h2>
                <ol>
                  {items.map((intention) => (
                    <li key={intention.id}>
                      <span className="intentions-print-sheet__for">{intention.intentionFor}</span>
                      <span className="intentions-print-sheet__by">Requested by {intention.requestedBy}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}

          <p className="intentions-print-sheet__count">
            {slot.intentions.length} {slot.intentions.length === 1 ? "intention" : "intentions"}
          </p>
        </section>
      ))}
    </PrintSheet>
  );
}
