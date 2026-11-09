// src/features/parish-admin/schedule/AdminSchedulePage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { getOccurrencesForMonth } from "./api/scheduleApi";
import { splitRegularMasses, toISO } from "./scheduleHelpers";
import { MonthCalendarGrid } from "./components/MonthCalendarGrid";
import { DayAgendaSidebar } from "./components/DayAgendaSidebar";
import { EventsListView } from "./components/EventsListView";
import { ScheduleEventModal } from "./components/ScheduleEventModal";
import { AssignBlockModal } from "./components/AssignBlockModal";
import type { LiturgicalDay, ScheduleBlock, ScheduleOccurrence } from "./types";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";

const TODAY_ISO = toISO(new Date());

export function AdminSchedulePage() {
  // The dashboard links here with ?needs=record to list sacraments still to be written in the register.
  const [searchParams] = useSearchParams();
  const needsRecording = searchParams.get("needs") === "record";
  const [view, setView] = useState<"calendar" | "list">(needsRecording ? "list" : "calendar");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(TODAY_ISO);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [monthData, setMonthData] = useState<Record<string, ScheduleOccurrence[]>>({});
  const [calendar, setCalendar] = useState<Record<string, LiturgicalDay>>({});
  const [loading, setLoading] = useState(true);
  const [listSearch, setListSearch] = useState("");

  const [addModalDate, setAddModalDate] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<ScheduleOccurrence | null>(null);
  const [editTarget, setEditTarget] = useState<ScheduleBlock | null>(null);
  /** Bumped after an edit so the list view fetches again. */
  const [listVersion, setListVersion] = useState(0);

  const fetchMonth = useCallback(
    () =>
      getOccurrencesForMonth(cursor.getFullYear(), cursor.getMonth()).then((data) => {
        setMonthData(data.occurrences);
        setCalendar(data.calendar);
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

  return (
    <AdminPage>
      <AdminPageHeader
        title="Parish Schedule & Events"
        description="Baptisms, weddings, funerals, and other events. Regular Masses are in Settings."
        actions={<AdminButton onClick={() => setAddModalDate(selectedDate)}>+ Add block</AdminButton>}
      />

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
          initialNeedsRecording={needsRecording}
        />
      ) : (
        <div className={`grid grid-cols-1 items-start gap-4 ${sidebarCollapsed ? "" : "lg:grid-cols-[minmax(0,1fr)_360px]"}`}>
          <MonthCalendarGrid
            cursor={cursor}
            monthData={eventsByDate}
            calendar={calendar}
            loading={loading}
            selectedDate={selectedDate}
            todayStr={TODAY_ISO}
            onSelectDate={setSelectedDate}
            onPrevMonth={() => shiftMonth(-1)}
            onNextMonth={() => shiftMonth(1)}
            onToday={goToday}
          />
          {!sidebarCollapsed && (
            <DayAgendaSidebar
              dateStr={selectedDate}
              occurrences={eventsByDate[selectedDate] ?? []}
              massTimes={massTimesByDate[selectedDate] ?? []}
              liturgicalDay={calendar[selectedDate]}
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
    </AdminPage>
  );
}