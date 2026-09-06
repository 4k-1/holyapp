// src/services/mocks/schedule.mock.ts
import type { RecurringCommitment, ScheduleBlock } from "@/features/parish-admin/schedule/types";

export const RECURRING_COMMITMENTS: RecurringCommitment[] = [
  {
    id: "rc1",
    label: "Daily Mass",
    type: "mass",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    slots: [
      { start: "6:00 AM", end: "7:00 AM" },
      { start: "6:00 PM", end: "7:00 PM" },
    ],
    assignee: "",
    showOnOverview: false,
  },
  {
    id: "rc2",
    label: "Sunday Mass",
    type: "mass",
    days: ["Sun"],
    slots: [
      { start: "6:00 AM", end: "7:00 AM" },
      { start: "8:00 AM", end: "9:00 AM" },
      { start: "10:00 AM", end: "11:00 AM" },
      { start: "5:00 PM", end: "6:00 PM" },
    ],
    assignee: "",
  },
  {
    id: "rc3",
    label: "Novena to Our Lady of Perpetual Help",
    type: "novena",
    days: ["Wed"],
    slots: [{ start: "6:00 PM", end: "7:00 PM" }],
    assignee: "Fr. Emilio Santos",
  },
];

/** occurrenceId -> assignee override for a single date/time instance of a recurring commitment */
export const RECURRING_OVERRIDES: Record<string, string> = {};

export const SCHEDULE_BLOCKS: ScheduleBlock[] = [
  { id: "sb1", date: "2026-06-23", start: "3:00 PM", end: "4:00 PM", title: "House Blessing — Cruz Residence", type: "blessing", source: "Blessing Service", assignee: "Fr. Juan Santos" },
  { id: "sb2", date: "2026-06-24", start: "10:00 AM", end: "11:00 AM", title: "Canonical Interview — Escaño & Santos", type: "interview", source: "Marriage Process", assignee: "Fr. Emilio Santos" },
  { id: "sb3", date: "2026-06-25", start: "2:00 PM", end: "3:00 PM", title: "Diocesan Clergy Meeting", type: "manual", source: "Manual", assignee: "Fr. Juan Santos" },
  { id: "sb4", date: "2026-06-24", start: "9:00 AM", end: "10:00 AM", title: "Baptism — Baby Flores", type: "baptism", source: "Sacrament", assignee: "Fr. Juan Santos", recordStatus: "Pending" },
  { id: "sb5", date: "2026-06-24", start: "1:00 PM", end: "2:00 PM", title: "Wedding — Reyes / Cruz", type: "wedding", source: "Sacrament", assignee: "Fr. Emilio Santos", recordStatus: "Recorded" },
  { id: "sb6", date: "2026-06-28", start: "9:00 AM", end: "11:00 AM", title: "Confirmation batch", type: "confirmation", source: "Sacrament", assignee: "Fr. Juan Santos", recordStatus: "Pending" },
];

// TODO: swap for real assignee options once staff/clergy accounts are wired up
export const ASSIGNABLE_STAFF = ["Fr. Juan Santos", "Fr. Emilio Santos"];
