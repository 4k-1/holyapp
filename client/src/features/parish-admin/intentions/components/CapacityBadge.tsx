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
  remaining: number;
}) {
  const label = state === "full" ? "Full" : state === "nearly_full" ? `${remaining} remaining` : `${remaining} open`;
  return <AdminBadge tone={TONE[state]}>{label}</AdminBadge>;
}
