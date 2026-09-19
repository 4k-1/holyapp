import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { CapacityBadge } from "@/features/parish-admin/intentions/components/CapacityBadge";
import { formatSlotHeading } from "@/features/parish-admin/intentions/intentionsHelpers";
import type { MassSlotView } from "@/types";

interface MassSlotPickerProps {
  slots: MassSlotView[];
  selectedId: string | null;
  onSelect: (slot: MassSlotView) => void;
}

/** One Mass at a time: pick which Mass's intentions to view from this list. */
export function MassSlotPicker({ slots, selectedId, onSelect }: MassSlotPickerProps) {
  return (
    <AdminCard className="max-h-[70vh] overflow-y-auto">
      <ul className="divide-y divide-admin-border" role="listbox" aria-label="Masses">
        {slots.map((slot) => {
          const active = slot.id === selectedId;
          return (
            <li key={slot.id}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(slot)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                  active ? "bg-admin-green-050" : "hover:bg-admin-surface-alt"
                }`}
              >
                <span
                  className={`min-w-0 truncate font-serif text-admin-body font-semibold ${
                    active ? "text-admin-green-900" : "text-admin-ink"
                  }`}
                >
                  {formatSlotHeading(slot.date, slot.time)}
                </span>
                <span className="flex flex-shrink-0 items-center gap-2">
                  <span className="whitespace-nowrap text-admin-support tabular-nums text-admin-ink-muted">
                    {slot.bookedCount}/{slot.maxIntentions}
                  </span>
                  <CapacityBadge state={slot.capacityState} remaining={slot.remaining} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </AdminCard>
  );
}
