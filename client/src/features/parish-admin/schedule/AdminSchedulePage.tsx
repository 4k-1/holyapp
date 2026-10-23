// src/features/parish-admin/schedule/AdminSchedulePage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { getOccurrencesForMonth } from "./api/scheduleApi";
import { splitRegularMasses, toISO } from "./scheduleHelpers";
import { MonthCalendarGrid } from "./components/MonthCalendarGrid";
import { DayAgendaSidebar } from "./components/DayAgendaSidebar";
import { EventsListView } from "./components/EventsListView";
import { ScheduleEventModal } from "./components/ScheduleEventModal";
import { AssignBlockModal } from "./components/AssignBlockModal";
import { RecurringCommitmentsManagerModal } from "./components/RecurringCommitmentsManagerModal";
import type { ScheduleBlock, ScheduleOccurrence } from "./types";

const TODAY_ISO = toISO(new Date());

export function AdminSchedulePage() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(TODAY_ISO);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [monthData, setMonthData] = useState<Record<string, ScheduleOccurrence[]>>({});
  const [loading, setLoading] = useState(true);
  const [listSearch, setListSearch] = useState("");

  const [addModalDate, setAddModalDate] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<ScheduleOccurrence | null>(null);
  const [editTarget, setEditTarget] = useState<ScheduleBlock | null>(null);
  /** Bumped after an edit so the list view fetches again. */
  const [listVersion, setListVersion] = useState(0);
  const [managerOpen, setManagerOpen] = useState(false);

  const fetchMonth = useCallback(
    () =>
      getOccurrencesForMonth(cursor.getFullYear(), cursor.getMonth()).then((data) => {
        setMonthData(data);
        setLoading(false);
      }),
    [cursor]
  );

  function reload() {
    setLoading(true);
    return fetchMonth();
  }

  const { events: eventsByDate, massTimes: massTimesByDate } = useMemo(() => splitRegularMasses(monthData), [monthData]);

  // Show the loading state as soon as the month changes.
  const [prevCursor, setPrevCursor] = useState(cursor);
  if (cursor !== prevCursor) {
    setPrevCursor(cursor);
    setLoading(true);
  }

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  function shiftMonth(dir: number) {
    setCursor((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + dir);
      return next;
    });
  }

  function goToday() {
    setCursor(new Date());
    setSelectedDate(TODAY_ISO);
  }

  function jumpToDay(dateStr: string) {
    setSelectedDate(dateStr);
    setView("calendar");
  }

  function viewAssigneeSchedule(assignee: string) {
    setListSearch(assignee);
    setView("list");
  }

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-admin-page font-semibold text-admin-ink">Parish Schedule & Events</h1>
          <p className="mt-1 max-w-xl text-admin-body text-admin-ink-muted">
            Baptisms, weddings, funerals, and other events. Regular Masses are in Settings.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setManagerOpen(true)}
            className="whitespace-nowrap shrink-0 text-admin-support font-semibold text-admin-green-700 hover:underline"
          >
            Manage recurring schedule
          </button>
          <AdminButton onClick={() => setAddModalDate(selectedDate)}>+ Add block</AdminButton>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[10px] border border-admin-border bg-admin-surface-alt p-1">
          <button
            onClick={() => setView("calendar")}
            className={`rounded-[7px] px-3.5 py-1.5 text-admin-support font-semibold transition ${
              view === "calendar" ? "bg-admin-surface text-admin-ink shadow-sm" : "text-admin-ink-muted"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-[7px] px-3.5 py-1.5 text-admin-support font-semibold transition ${
              view === "list" ? "bg-admin-surface text-admin-ink shadow-sm" : "text-admin-ink-muted"
            }`}
          >
            List
          </button>
        </div>

        {view === "calendar" && (
          <div className="flex items-center gap-2">
            <button
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
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-surface text-admin-ink-muted hover:bg-admin-surface-alt"
              aria-label="Next month"
            >
              ›
            </button>
            <AdminButton variant="secondary" size="sm" onClick={goToday}>
              Today
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={() => setSidebarCollapsed((v) => !v)}>
              {sidebarCollapsed ? "Show details" : "Hide details"}
            </AdminButton>
          </div>
        )}
      </div>

      {view === "list" ? (
        <EventsListView
          onViewDay={jumpToDay}
          searchQuery={listSearch}
          onSearchQueryChange={setListSearch}
          onEdit={setEditTarget}
          reloadKey={listVersion}
        />
      ) : (
        <div className={`grid grid-cols-1 gap-4 ${sidebarCollapsed ? "" : "lg:grid-cols-[1fr_400px]"}`}>
          <MonthCalendarGrid
            cursor={cursor}
            monthData={eventsByDate}
            loading={loading}
            selectedDate={selectedDate}
            todayStr={TODAY_ISO}
            onSelectDate={setSelectedDate}
          />
          {!sidebarCollapsed && (
            <DayAgendaSidebar
              dateStr={selectedDate}
              occurrences={eventsByDate[selectedDate] ?? []}
              massTimes={massTimesByDate[selectedDate] ?? []}
              todayStr={TODAY_ISO}
              onAdd={() => setAddModalDate(selectedDate)}
              onAssign={setAssignTarget}
              onEdit={setEditTarget}
              onChanged={reload}
              onViewAssignee={viewAssigneeSchedule}
            />
          )}
        </div>
      )}

      {addModalDate && (
        <ScheduleEventModal
          defaultDate={addModalDate}
          onClose={() => setAddModalDate(null)}
          onSaved={() => {
            setAddModalDate(null);
            reload();
            setListVersion((v) => v + 1);
          }}
        />
      )}

      {editTarget && (
        <ScheduleEventModal
          event={editTarget}
          defaultDate={editTarget.date}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            reload();
            setListVersion((v) => v + 1);
          }}
        />
      )}

      {assignTarget && (
        <AssignBlockModal
          occurrence={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            setAssignTarget(null);
            reload();
          }}
        />
      )}

      {managerOpen && (
        <RecurringCommitmentsManagerModal onClose={() => setManagerOpen(false)} onChanged={reload} />
      )}
    </div>
  );
}