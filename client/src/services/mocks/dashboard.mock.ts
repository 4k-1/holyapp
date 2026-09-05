// src/services/mocks/dashboard.mock.ts
import type {
    ActivityItem,
    AttentionItem,
    DashboardStat,
    QuickAction,
    TodayMass,
    UpcomingEvent,
  } from "@/features/parish-admin/dashboard/types";
  
  export const ATTENTION_ITEMS: AttentionItem[] = [
    {
      id: "a1",
      boldText: "15 certificate requests",
      restText: " are waiting for review, 4 of them already paid and ready to issue.",
      ctaLabel: "Review requests",
      ctaHref: "requests",
      ctaVariant: "primary",
    },
    {
      id: "a2",
      boldText: "1 baptism",
      restText: " from June 24 hasn't been recorded yet — the event has already passed.",
      ctaLabel: "Open calendar",
      ctaHref: "schedule",
      ctaVariant: "secondary",
    },
  ];
  
  export const DASHBOARD_STATS: DashboardStat[] = [
    { id: "pending", icon: "inbox", chipTone: "amber", label: "Pending Requests", value: "15", delta: "+3 since yesterday" },
    { id: "topay", icon: "wallet", chipTone: "gold", label: "To Be Paid", value: "4", delta: "Ready once confirmed" },
    { id: "released", icon: "check", chipTone: "green", label: "Released This Month", value: "26", delta: "+6 vs. last month" },
    { id: "events", icon: "calendar", chipTone: "green", label: "Events This Week", value: "3", delta: "1 needs recording" },
  ];
  
  export const QUICK_ACTIONS: QuickAction[] = [
    { id: "qa1", icon: "plus", label: "Add a record", href: "records/baptismal" },
    { id: "qa2", icon: "file", label: "Generate a certificate", href: "records/baptismal" },
    { id: "qa3", icon: "chart", label: "View reports", href: "reports/sacraments" },
    { id: "qa4", icon: "scan", label: "Browse digitized ledgers", href: "records/ledgers" },
  ];
  
  // Daily Mass (rc1) has assignee: '' in the recurring schedule mock — both slots show as Unassigned.
  export const TODAY_MASSES: TodayMass[] = [
    { id: "tm1", time: "6:00 AM", priest: "" },
    { id: "tm2", time: "6:00 PM", priest: "" },
  ];
  
  export const RECENT_ACTIVITY: ActivityItem[] = [
    { id: "ra1", title: "Baptismal certificate issued to Jenna Mae Marbella", meta: "Request R21 · 10 minutes ago" },
    { id: "ra2", title: "New request submitted by Alexandria Santos", meta: "Request R24 · 2 hours ago" },
    { id: "ra3", title: "Confirmation annotation added to Jenna Mae Marbella", meta: "Baptismal Book 6, Page 21, Line 04 · Yesterday" },
    { id: "ra4", title: "Marriage record created for the Escaño–Cruz union", meta: "Book 4, Page 09, Line 09 · Yesterday" },
  ];
  
  export const UPCOMING_EVENTS: UpcomingEvent[] = [
    { id: "ue1", title: "Baptism — Baby Flores", date: "June 24, 2026", status: "Pending recording", dotTone: "amber" },
    { id: "ue2", title: "Wedding — Reyes / Cruz", date: "June 24, 2026", status: "Recorded", dotTone: "green" },
    { id: "ue3", title: "Confirmation batch", date: "June 28, 2026", status: "Upcoming", dotTone: "gold" },
  ];