import { AdminBadge } from "@/components/ui/AdminBadge";
import type { MassSlotCapacityState } from "@/types";

const TONE: Record<MassSlotCapacityState, "green" | "amber" | "red"> = {
  open: "green",
  nearly_full: "amber",
  full: "red",
};

export function CapacityBadge({
  state,
  remaining,
}: {
  state: MassSlotCapacityState;
  /** null when there is no limit. */
  remaining: number | null;
}) {
  const label =
    remaining === null
      ? "No limit"
      : state === "full"
        ? "Full"
        : state === "nearly_full"
          ? `${remaining} remaining`
          : `${remaining} open`;
  return <AdminBadge tone={TONE[state]}>{label}</AdminBadge>;
}
