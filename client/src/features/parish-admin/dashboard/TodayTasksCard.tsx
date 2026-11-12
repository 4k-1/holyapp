import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listUnconfirmedCertificates,
  type UnconfirmedCertificate,
} from "@/features/parish-admin/requests/api/requestsAdminApi";
import { UnconfirmedPrintsList } from "./UnconfirmedPrintsCard";
import {
  TASK_GROUP_LABEL,
  buildTasks,
  currentCounts,
  mergePeaks,
  readPeaks,
  savePeaks,
  type DayTask,
  type TaskGroup,
} from "./todayTasks";
import type { TaskCounts } from "./types";

const GROUPS: TaskGroup[] = ["mass", "today", "week"];

/**
 * The office's to-do list for the day, built from live counts: each task ticks itself off when the work is done,
 * and finished ones stay greyed until the day ends so the progress shows.
 */
export function TodayTasksCard({ counts, scope }: { counts: TaskCounts; scope: string }) {
  const [copies, setCopies] = useState<UnconfirmedCertificate[] | null>(null);
  const [printsOpen, setPrintsOpen] = useState(false);

  useEffect(() => {
    listUnconfirmedCertificates()
      .then(setCopies)
      .catch(() => setCopies([]));
  }, []);

  const unconfirmed = copies === null ? null : copies.length;
  const peaks = useMemo(
    () => mergePeaks(readPeaks(scope, counts.date), currentCounts(counts, unconfirmed)),
    [scope, counts, unconfirmed]
  );
  useEffect(() => savePeaks(scope, counts.date, peaks), [scope, counts.date, peaks]);

  const tasks = buildTasks(counts, peaks, unconfirmed);
  const doneCount = tasks.filter((t) => t.done).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;

  return (
    <section className="admin-dash__card mb-5 p-4 sm:mb-6 sm:p-5" aria-labelledby="today-tasks-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="today-tasks-title" className="text-[1rem] font-semibold text-[var(--dash-ink)]">
          Today’s tasks
        </h2>
        {tasks.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="admin-dash__muted text-admin-support tabular-nums">
              {doneCount} of {tasks.length} done
            </span>
            <span
              className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--dash-border)]"
              role="progressbar"
              aria-label="Tasks done today"
              aria-valuemin={0}
              aria-valuemax={tasks.length}
              aria-valuenow={doneCount}
            >
              <span
                className="block h-full rounded-full bg-[var(--dash-green)] transition-[width] duration-500"
                style={{ width: `${(doneCount / tasks.length) * 100}%` }}
              />
            </span>
          </div>
        )}
      </div>

      {(tasks.length === 0 || allDone) && (
        <div className="mb-1 flex items-center gap-3 rounded-[var(--dash-radius-sm)] bg-[var(--dash-green-soft)] px-4 py-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[var(--dash-green)]">
            <CheckGlyph className="h-4 w-4" />
          </span>
          <p className="text-admin-body text-[var(--dash-green-deep)]">
            <span className="font-semibold">You’re all caught up.</span>{" "}
            {tasks.length === 0 ? "Nothing is waiting for the office today." : "Everything for today is done."}
          </p>
        </div>
      )}

      {GROUPS.map((group) => {
        const list = tasks.filter((t) => t.group === group).sort((a, b) => Number(a.done) - Number(b.done));
        if (list.length === 0) return null;
        return (
          <div key={group} className="mt-4 first:mt-0">
            <h3 className="admin-dash__muted mb-2 text-admin-label font-semibold">{TASK_GROUP_LABEL[group]}</h3>
            <ul className="space-y-2">
              {list.map((task) => (
                <li key={task.id}>
                  <TaskRow
                    task={task}
                    expanded={task.id === "prints" && printsOpen}
                    onToggle={task.id === "prints" ? () => setPrintsOpen((v) => !v) : undefined}
                  />
                  {task.id === "prints" && printsOpen && copies && copies.length > 0 && (
                    <div id="today-prints" className="mt-2 rounded-[var(--dash-radius-sm)] border border-[var(--dash-border)] p-3.5">
                      <UnconfirmedPrintsList
                        copies={copies}
                        onAnswered={(id) => setCopies((list) => (list ?? []).filter((c) => c.id !== id))}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function TaskRow({ task, expanded, onToggle }: { task: DayTask; expanded: boolean; onToggle?: () => void }) {
  return (
    <div className={`admin-dash__row items-center ${task.done ? "opacity-70" : ""}`}>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          task.done
            ? "bg-[var(--dash-green)] text-white"
            : "border-[1.5px] border-[var(--dash-border-strong)] bg-white"
        }`}
        aria-hidden="true"
      >
        {task.done && <CheckGlyph className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-admin-body ${
            task.done ? "text-[var(--dash-ink-soft)] line-through decoration-[var(--dash-ink-faint)]" : "font-medium text-[var(--dash-ink)]"
          }`}
        >
          <span className="sr-only">{task.done ? "Done: " : "To do: "}</span>
          {task.label}
        </p>
        {task.hint && !task.done && <p className="admin-dash__muted mt-0.5 text-admin-support">{task.hint}</p>}
      </div>
      {!task.done &&
        (onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls="today-prints"
            className="admin-dash__cta-ghost shrink-0"
          >
            {expanded ? "Hide" : task.cta}
            <ArrowGlyph className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        ) : (
          task.href && (
            <Link to={task.href} className="admin-dash__cta-ghost shrink-0">
              {task.cta}
              <ArrowGlyph className="h-3.5 w-3.5" />
            </Link>
          )
        ))}
    </div>
  );
}

function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function ArrowGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
