import type { MassScheduleEntry } from "@/types";

export const MOCK_MASS_SCHEDULE: MassScheduleEntry[] = [
  { dayType: "weekday", label: "Weekdays", times: ["6:00 AM", "6:00 PM"] },
  { dayType: "saturday", label: "Saturday", times: ["6:00 AM", "6:00 PM (Anticipated)"] },
  { dayType: "sunday", label: "Sunday", times: ["6:00 AM", "8:00 AM", "10:00 AM", "5:00 PM"] },
  { dayType: "firstFriday", label: "First Friday", times: ["6:00 AM", "12:00 NN", "6:00 PM"] },
];