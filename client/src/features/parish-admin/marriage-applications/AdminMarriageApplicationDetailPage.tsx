import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import {
  CalendarIcon,
  HeartIcon,
} from "@/components/ui/icons/AdminIcons";
import {
  AdminButton,
  AdminField,
  AdminFormSection,
  AdminInput,
  ChecklistIcon,
  FileIcon,
  type AdminSectionTone,
} from "@/features/parish-admin/components/AdminForm";
import {
  confirmWeddingDate,
  getMarriageApplication,
  rejectMarriageApplication,
  reserveWeddingDate,
  updateBanns,
  updateMarriageCircumstances,
  updateMarriageDispensation,
  verifyMarriageRequirement,
} from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import {
  STAGE_LABEL,
  applicationStage,
  daysUntil,
  formatWeddingDate,
  nextStep,
  requirementGroup,
  requirementProgress,
  requirementStep,
  stepsFor,
  weddingDateOf,
  type RequirementGroup,
} from "@/features/parish-admin/marriage-applications/applicationProgress";
import { liturgicalSummary, useCalendarCheck } from "@/features/parish-admin/schedule/calendarCheck";
import { CalendarWarningNotice } from "@/features/parish-admin/schedule/components/CalendarWarnings";
import {
  CIRCUMSTANCES,
  type DispensationStatus,
  type MarriageApplication,
  type MarriageRequirement,
} from "@/features/parish-admin/marriage-applications/types";
import { listAssignableStaff } from "@/features/parish-admin/schedule/api/scheduleApi";
import { StaffSelect } from "@/features/parish-admin/schedule/components/StaffSelect";
import {
  assigneeValueOf,
  NOBODY,
  type AssignableStaff,
  type AssigneeValue,
} from "@/features/parish-admin/schedule/types";
import {
  convert24to12,
  to24Hour,
} from "@/features/parish-admin/schedule/scheduleHelpers";
import { askConfirm } from "@/lib/notify";
import { BannsPanel } from "./BannsPanel";
import { PAGE_TITLE_CLASS, PAGE_WIDTH_CLASS } from "@/features/parish-admin/components/adminPageStyles";
import { AdminBackLink } from "@/features/parish-admin/components/AdminBackLink";

const GROUPS: RequirementGroup[] = ["Bride", "Groom", "Couple", "Preparation"];

const GROUP_HEADING: Record<RequirementGroup, string> = {
  Bride: "Bride's documents",
  Groom: "Groom's documents",
  Couple: "Documents for both",
  Preparation: "Marriage preparation",
};

/** Same tones the marriage register uses for each party, so bride and groom read the same everywhere. */
const GROUP_TONE: Record<RequirementGroup, AdminSectionTone> = {
  Bride: "rose",
  Groom: "blue",
  Couple: "green",
  Preparation: "gold",
};

const PREP_ACTION = {
  interview: "Mark interview held",
  precana: "Mark Pre-Cana attended",
  banns: "Mark banns published",
} as const;

const DISPENSATION_LABEL: Record<DispensationStatus, string> = {
  none: "Not needed",
  pending: "Pending",
  granted: "Granted",
  denied: "Denied",
};

function formatReceived(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "2027-05-08" → "8 May 2027". */
function formatDocDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDay(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fullName(first: string, middle: string, last: string) {
  return [first, middle, last].filter(Boolean).join(" ");
}

/** "in 40 days", "today", "3 days ago" — how far the wedding date is from today. */
function countdown(iso: string) {
  const days = daysUntil(iso);
  if (days === 0) return { text: "today", urgent: true };
  if (days < 0)
    return { text: `${-days} day${days === -1 ? "" : "s"} ago`, urgent: true };
  return { text: `in ${days} day${days === 1 ? "" : "s"}`, urgent: days <= 30 };
}

/** Missing required items first, then missing optional ones, then what has been received. */
function byUrgency(a: MarriageRequirement, b: MarriageRequirement) {
  const rank = (item: MarriageRequirement) =>
    item.submitted ? 2 : item.required ? 0 : 1;
  return rank(a) - rank(b);
}

export function AdminMarriageApplicationDetailPage() {
  const { applicationId = "" } = useParams();
  const [application, setApplication] = useState<MarriageApplication | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [saving, setSaving] = useState(false);

  const [needed, setNeeded] = useState(false);
  const [dispStatus, setDispStatus] = useState<DispensationStatus>("none");
  const [dispNotes, setDispNotes] = useState("");
  const [editingDispensation, setEditingDispensation] = useState(false);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [assignee, setAssignee] = useState<AssigneeValue>(NOBODY);
  const [editingDate, setEditingDate] = useState(false);
  const weddingCalendar = useCalendarCheck(editingDate ? date : "", "wedding");
  const [bookAnywayKey, setBookAnywayKey] = useState("");
  const bookAnyway = bookAnywayKey === weddingCalendar.warningKey;
  const [rejecting, setRejecting] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const dateCardRef = useRef<HTMLDivElement>(null);
  const requirementsRef = useRef<HTMLDivElement>(null);

  function fillFrom(next: MarriageApplication) {
    setApplication(next);
    setNeeded(next.dispensationNeeded);
    setDispStatus(
      next.dispensationNeeded && next.dispensationStatus === "none"
        ? "pending"
        : next.dispensationStatus,
    );
    setDispNotes(next.dispensationNotes);
    setDate(weddingDateOf(next));
    const from = next.weddingEvent?.start || next.preferredWeddingStart;
    const to = next.weddingEvent?.end || next.preferredWeddingEnd;
    if (from) {
      setStart(to24Hour(from));
      setEnd(to24Hour(to || from));
    }
    setAssignee(assigneeValueOf(next.weddingEvent));
  }

  const fetchApplication = useCallback(
    () =>
      getMarriageApplication(applicationId)
        .then(fillFrom)
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't load this application.",
          );
        })
        .finally(() => {
          setLoading(false);
        }),
    [applicationId],
  );

  const [prevApplicationId, setPrevApplicationId] = useState(applicationId);
  if (applicationId !== prevApplicationId) {
    setPrevApplicationId(applicationId);
    setLoading(true);
    setError("");
  }

  useEffect(() => {
    fetchApplication();
    listAssignableStaff().then(setStaff);
  }, [fetchApplication]);

  async function run(
    task: () => Promise<MarriageApplication>,
    after?: () => void,
  ) {
    setSaving(true);
    setError("");
    try {
      fillFrom(await task());
      after?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  // On narrow screens the stepper scrolls sideways; keep the current step in view.
  const stepperRef = useRef<HTMLDivElement>(null);
  const currentStepKey = application
    ? stepsFor(application).find((step) => step.state === "now")?.key
    : undefined;
  useEffect(() => {
    const box = stepperRef.current;
    const now = box?.querySelector<HTMLElement>("[data-current-step]");
    if (!box || !now || box.scrollWidth <= box.clientWidth) return;
    const boxRect = box.getBoundingClientRect();
    const nowRect = now.getBoundingClientRect();
    box.scrollLeft +=
      nowRect.left - boxRect.left - (boxRect.width - nowRect.width) / 2;
  }, [currentStepKey]);

  if (loading && !application) {
    return (
      <p className="text-admin-body text-admin-ink-muted">
        Loading application…
      </p>
    );
  }
  if (!application) {
    return (
      <p className="text-admin-body text-admin-ink-muted">
        {error || "Application not found."}
      </p>
    );
  }

  const stage = applicationStage(application);
  const closed = stage === "closed";
  const { done, total, missing } = requirementProgress(application);
  const weddingDate = weddingDateOf(application);
  const hasDate =
    Boolean(weddingDate) && application.weddingDateStatus !== "none";
  const dispensationBlocks =
    application.dispensationNeeded &&
    application.dispensationStatus !== "granted";
  const confirmBlocker =
    application.weddingDateStatus !== "reserved"
      ? "Reserve a date first."
      : missing.length > 0
        ? `Can't confirm yet: ${missing.length} document${missing.length === 1 ? "" : "s"} still missing.`
        : dispensationBlocks
          ? "Can't confirm yet: the dispensation isn't granted."
          : "";

  const steps = stepsFor(application);
  const brideFull = fullName(
    application.brideFirstName,
    application.brideMiddleName,
    application.brideLastName,
  );
  const groomFull = fullName(
    application.groomFirstName,
    application.groomMiddleName,
    application.groomLastName,
  );

  const statusTone =
    stage === "cleared"
      ? "green"
      : application.status === "rejected"
        ? "red"
        : "muted";
  const statusLabel =
    application.status === "rejected"
      ? "Rejected"
      : application.status === "completed"
        ? "Married"
        : STAGE_LABEL[stage];
  const when = weddingDate && !closed ? countdown(weddingDate) : null;

  function showDateForm() {
    setEditingDate(true);
    requestAnimationFrame(() =>
      dateCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      }),
    );
  }

  function showMissing() {
    const first =
      requirementsRef.current?.querySelector<HTMLElement>("[data-missing]");
    (first ?? requirementsRef.current)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  // The one thing to do next, as a button. Preparation steps are single checklist items, so they can be ticked from here.
  const prepItem =
    stage === "interview" || stage === "precana" || stage === "banns"
      ? application.requirements.find(
          (item) =>
            item.required && !item.submitted && requirementStep(item) === stage,
        )
      : undefined;
  let nextAction: ReactNode = null;
  if (stage === "documents") {
    nextAction = (
      <AdminButton type="button" onClick={showMissing}>
        Show missing documents
      </AdminButton>
    );
  } else if (prepItem) {
    nextAction = (
      <AdminButton
        type="button"
        disabled={saving}
        onClick={() =>
          run(() =>
            verifyMarriageRequirement(application.id, prepItem.id, true),
          )
        }
      >
        {PREP_ACTION[stage as keyof typeof PREP_ACTION]}
      </AdminButton>
    );
  } else if (stage === "date" && application.weddingDateStatus === "reserved") {
    nextAction = (
      <AdminButton
        type="button"
        disabled={saving || Boolean(confirmBlocker)}
        onClick={() => run(() => confirmWeddingDate(application.id))}
      >
        Confirm wedding
      </AdminButton>
    );
  } else if (stage === "date") {
    nextAction = (
      <AdminButton type="button" onClick={showDateForm} disabled={editingDate}>
        Reserve a date
      </AdminButton>
    );
  } else if (stage === "cleared") {
    nextAction = (
      <Link
        to="../../records/marriage/new"
        relative="path"
        className="inline-flex min-h-[40px] items-center rounded-xl bg-admin-green-700 px-4 text-admin-body font-semibold text-white hover:bg-admin-green-600"
      >
        Open marriage register
      </Link>
    );
  }

  return (
    <div className={PAGE_WIDTH_CLASS}>
      <AdminBackLink />

      <AdminCard className="mb-4 p-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-4">
            <CoupleAvatars bride={brideFull} groom={groomFull} />
            <div className="min-w-0">
              <h1 className={PAGE_TITLE_CLASS}>
                {brideFull}{" "}
                <span className="font-normal text-admin-ink-faint">&amp;</span>{" "}
                {groomFull}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-admin-body text-admin-ink-muted">
                <CalendarIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {weddingDate ? (
                  <>
                    <span>
                      {application.weddingDateStatus === "confirmed"
                        ? "Wedding"
                        : hasDate
                          ? "Reserved"
                          : "Preferred date"}
                      :{" "}
                      <span className="font-semibold text-admin-ink">
                        {formatWeddingDate(weddingDate)}
                      </span>
                      {application.weddingEvent?.start
                        ? ` at ${application.weddingEvent.start}`
                        : ""}
                    </span>
                    {when && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-admin-label font-semibold ${
                          when.urgent && stage !== "cleared"
                            ? "bg-admin-red-100 text-admin-red-700"
                            : "bg-admin-surface-alt text-admin-ink-muted"
                        }`}
                      >
                        {when.text}
                      </span>
                    )}
                  </>
                ) : (
                  <span>No wedding date yet</span>
                )}
              </p>
            </div>
          </div>
          <AdminBadge tone={statusTone}>{statusLabel}</AdminBadge>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 overflow-hidden p-0">
        <div ref={stepperRef} className="overflow-x-auto px-4 pb-4 pt-5">
          <ol
            className="grid min-w-[560px] grid-cols-6"
            aria-label="Marriage preparation progress"
          >
            {steps.map((step, i) => (
              <li
                key={step.key}
                className="relative px-1 text-center"
                data-current-step={step.state === "now" || undefined}
              >
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className={`absolute right-1/2 top-[13px] h-0.5 w-full ${
                      step.state === "done" && steps[i - 1].state === "done"
                        ? "bg-admin-green-700"
                        : "bg-admin-border"
                    }`}
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-admin-label font-bold ${
                    step.state === "done"
                      ? "border-admin-green-700 bg-admin-green-700 text-white"
                      : step.state === "now"
                        ? "border-admin-gold-600 bg-admin-gold-100 text-admin-gold-700"
                        : "border-admin-border-strong bg-admin-surface text-admin-ink-muted"
                  }`}
                >
                  {step.state === "done" ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`mt-1.5 block text-admin-support leading-snug ${
                    step.state === "now"
                      ? "font-semibold text-admin-ink"
                      : step.state === "done"
                        ? "text-admin-ink"
                        : "text-admin-ink-muted"
                  }`}
                >
                  {step.label}
                </span>
                <span className="sr-only">
                  {step.state === "done"
                    ? " (done)"
                    : step.state === "now"
                      ? " (current step)"
                      : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5 ${
            closed
              ? "border-admin-border bg-admin-surface-alt"
              : "border-admin-gold-600/30 bg-admin-gold-100/40"
          }`}
          role="status"
        >
          <div className="min-w-0 flex-1 basis-[260px]">
            <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-gold-700">
              {closed ? "Status" : "Next step"}
            </p>
            <p className="mt-0.5 text-admin-body text-admin-ink">
              {nextStep(application, true)}
            </p>
            {stage === "date" &&
              application.weddingDateStatus === "reserved" &&
              confirmBlocker && (
                <p className="mt-0.5 text-admin-support text-admin-ink-muted">
                  {confirmBlocker}
                </p>
              )}
          </div>
          {nextAction && <div className="shrink-0">{nextAction}</div>}
        </div>
      </AdminCard>

      {error && (
        <p
          className="mb-4 rounded-lg bg-admin-red-100 px-4 py-3 text-admin-body font-semibold text-admin-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* The rail comes first so phones see the date and dispensation before the long checklist. */}
        <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <div ref={dateCardRef}>
            <RailCard
              title="Wedding date"
              icon={<CalendarIcon className="h-4 w-4" />}
            >
              {hasDate ? (
                <>
                  <p className="text-admin-body font-semibold text-admin-ink">
                    {formatWeddingDate(weddingDate)}
                  </p>
                  {application.weddingEvent && (
                    <p className="text-admin-body text-admin-ink-muted">
                      {application.weddingEvent.start} –{" "}
                      {application.weddingEvent.end}
                      {application.weddingEvent.assignee
                        ? ` · ${application.weddingEvent.assignee}`
                        : ""}
                    </p>
                  )}
                  <div className="mt-2.5">
                    {application.weddingDateStatus === "confirmed" ? (
                      <AdminBadge tone="green">Confirmed</AdminBadge>
                    ) : (
                      <AdminBadge tone="amber">
                        Reserved, not confirmed
                      </AdminBadge>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-admin-body text-admin-ink-muted">
                  {application.preferredWeddingDate
                    ? `Couple prefers ${formatWeddingDate(application.preferredWeddingDate)}. No date reserved yet.`
                    : "No date reserved yet."}
                </p>
              )}

              {!closed && application.weddingDateStatus !== "confirmed" && (
                <>
                  {editingDate ? (
                    <div className="mt-3 border-t border-admin-border pt-3">
                      <AdminField label="Date">
                        <AdminInput
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </AdminField>
                      <div className="grid grid-cols-2 gap-3">
                        <AdminField label="Start">
                          <AdminInput
                            type="time"
                            value={start}
                            onChange={(e) => setStart(e.target.value)}
                          />
                        </AdminField>
                        <AdminField label="End">
                          <AdminInput
                            type="time"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                          />
                        </AdminField>
                      </div>
                      <AdminField label="Priest">
                        <StaffSelect
                          staff={staff}
                          value={assignee}
                          onChange={setAssignee}
                          emptyLabel="Not assigned yet"
                          className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-admin-body text-admin-ink"
                        />
                      </AdminField>
                      {weddingCalendar.day?.title && (
                        <p className="mb-2 text-admin-support text-admin-ink-muted">
                          {liturgicalSummary(weddingCalendar.day)}
                        </p>
                      )}
                      <div className="mb-3">
                        <CalendarWarningNotice
                          warnings={weddingCalendar.warnings}
                          bookAnyway={bookAnyway}
                          onBookAnywayChange={(value) => setBookAnywayKey(value ? weddingCalendar.warningKey : "")}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <AdminButton
                          type="button"
                          variant="secondary"
                          onClick={() => setEditingDate(false)}
                          disabled={saving}
                        >
                          Cancel
                        </AdminButton>
                        <AdminButton
                          type="button"
                          disabled={
                            saving ||
                            !date ||
                            !start ||
                            !end ||
                            start >= end ||
                            (weddingCalendar.needsBookAnyway && !bookAnyway)
                          }
                          onClick={() =>
                            run(
                              () =>
                                reserveWeddingDate(application.id, {
                                  date,
                                  start: convert24to12(start),
                                  end: convert24to12(end),
                                  assigneeId: assignee.assigneeId,
                                  assignee: assignee.assigneeId ? "" : assignee.assignee.trim(),
                                  calendarOk: weddingCalendar.needsBookAnyway && bookAnyway,
                                }),
                              () => setEditingDate(false),
                            )
                          }
                        >
                          Reserve date
                        </AdminButton>
                      </div>
                    </div>
                  ) : (
                    // At the date step the next-step bar already offers "Reserve a date".
                    !(
                      stage === "date" &&
                      application.weddingDateStatus === "none"
                    ) && (
                      <AdminButton
                        type="button"
                        variant="secondary"
                        className="mt-3 w-full"
                        onClick={() => setEditingDate(true)}
                      >
                        {application.weddingDateStatus === "reserved"
                          ? "Change date"
                          : "Reserve a date"}
                      </AdminButton>
                    )
                  )}
                </>
              )}
            </RailCard>
          </div>

          <RailCard
            title="About the couple"
            icon={<HeartIcon className="h-4 w-4" />}
            description="Each yes adds the papers that case needs."
          >
            <ul className="space-y-2">
              {CIRCUMSTANCES.map((c) => (
                <li key={c.key}>
                  <label className="flex items-start gap-2 text-admin-body text-admin-ink">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={application.circumstances?.[c.key] === true}
                      disabled={saving || closed}
                      onChange={(e) =>
                        run(() =>
                          updateMarriageCircumstances(application.id, {
                            ...application.circumstances,
                            [c.key]: e.target.checked,
                          }),
                        )
                      }
                    />
                    <span>{c.question}</span>
                  </label>
                </li>
              ))}
            </ul>
          </RailCard>

          <RailCard
            title="Banns"
            icon={<CalendarIcon className="h-4 w-4" />}
            description="Announced at Mass on three Sundays where each of them lives."
          >
            <BannsPanel
              application={application}
              disabled={saving || closed}
              onSave={(banns) => run(() => updateBanns(application.id, banns))}
            />
          </RailCard>

          <RailCard
            title="Dispensation"
            icon={<FileIcon className="h-4 w-4" />}
            description="Diocesan permission, e.g. when one party isn't a baptized Catholic."
          >
            {editingDispensation ? (
              <>
                <label className="mb-3 flex min-h-[44px] items-center gap-2.5 text-admin-body text-admin-ink">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={needed}
                    onChange={(e) => setNeeded(e.target.checked)}
                  />
                  This marriage needs a dispensation
                </label>
                {needed && (
                  <>
                    <AdminField label="Status">
                      <select
                        value={dispStatus === "none" ? "pending" : dispStatus}
                        onChange={(e) =>
                          setDispStatus(e.target.value as DispensationStatus)
                        }
                        className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-admin-body text-admin-ink"
                      >
                        <option value="pending">Pending</option>
                        <option value="granted">Granted</option>
                        <option value="denied">Denied</option>
                      </select>
                    </AdminField>
                    <AdminField label="Notes">
                      <AdminInput
                        value={dispNotes}
                        onChange={(e) => setDispNotes(e.target.value)}
                      />
                    </AdminField>
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingDispensation(false)}
                    disabled={saving}
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      run(
                        () =>
                          updateMarriageDispensation(application.id, {
                            dispensationNeeded: needed,
                            dispensationStatus: needed
                              ? dispStatus === "none"
                                ? "pending"
                                : dispStatus
                              : "none",
                            dispensationNotes: needed ? dispNotes : "",
                          }),
                        () => setEditingDispensation(false),
                      )
                    }
                  >
                    Save
                  </AdminButton>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  {application.dispensationNeeded ? (
                    <AdminBadge
                      tone={
                        application.dispensationStatus === "granted"
                          ? "green"
                          : application.dispensationStatus === "denied"
                            ? "red"
                            : "amber"
                      }
                    >
                      {DISPENSATION_LABEL[application.dispensationStatus]}
                    </AdminBadge>
                  ) : (
                    <p className="text-admin-body text-admin-ink-muted">
                      Not needed
                    </p>
                  )}
                </div>
                {!closed && (
                  <button
                    type="button"
                    onClick={() => setEditingDispensation(true)}
                    className="min-h-[40px] rounded-sm text-admin-support font-semibold text-admin-green-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
                  >
                    {application.dispensationNeeded
                      ? "Update"
                      : "Mark as needed"}
                  </button>
                )}
                {application.dispensationNeeded &&
                  application.dispensationNotes && (
                    <p className="w-full text-admin-body text-admin-ink-muted">
                      {application.dispensationNotes}
                    </p>
                  )}
              </div>
            )}
          </RailCard>

          <RailCard
            title="Application"
            icon={<ChecklistIcon className="h-4 w-4" />}
          >
            <dl className="space-y-2.5">
              <DetailRow
                label="Reference"
                value={
                  <span className="font-mono">
                    {application.referenceNo}
                  </span>
                }
              />
              <DetailRow
                label="Submitted"
                value={formatDay(application.createdAt) || "—"}
              />
              <DetailRow
                label="Came in"
                value={
                  application.parishionerId
                    ? "Online, from a parishioner account"
                    : "Walk-in at the office"
                }
              />
              {application.updatedAt && (
                <DetailRow
                  label="Last updated"
                  value={formatDay(application.updatedAt)}
                />
              )}
              {application.remarks && (
                <DetailRow label="Remarks" value={application.remarks} />
              )}
            </dl>

            {!closed && stage !== "cleared" && (
              <div className="mt-4 border-t border-admin-border pt-3">
                {rejecting ? (
                  <>
                    <p className="mb-1 text-admin-body font-semibold text-admin-ink">
                      Reject this application
                    </p>
                    <p className="mb-3 text-admin-support text-admin-ink-muted">
                      This closes the application. It can&apos;t be undone.
                    </p>
                    <AdminField label="Reason">
                      <AdminInput
                        value={rejectRemarks}
                        onChange={(e) => setRejectRemarks(e.target.value)}
                      />
                    </AdminField>
                    <div className="flex justify-end gap-2">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        onClick={() => setRejecting(false)}
                        disabled={saving}
                      >
                        Cancel
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="danger"
                        disabled={saving || !rejectRemarks.trim()}
                        onClick={async () => {
                          const ok = await askConfirm({
                            title: "Reject this application?",
                            message: `The application of ${application.groomName} & ${application.brideName} will be closed.`,
                            confirmLabel: "Reject application",
                            danger: true,
                          });
                          if (!ok) return;
                          run(
                            () =>
                              rejectMarriageApplication(
                                application.id,
                                rejectRemarks.trim(),
                              ),
                            () => setRejecting(false),
                          );
                        }}
                      >
                        Reject
                      </AdminButton>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRejecting(true)}
                    className="min-h-[40px] rounded-sm text-admin-support font-semibold text-admin-red-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
                  >
                    Reject application…
                  </button>
                )}
              </div>
            )}
          </RailCard>
        </aside>

        <div
          ref={requirementsRef}
          className="min-w-0 lg:col-start-1 lg:row-start-1"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-admin-section font-semibold text-admin-ink">
              Requirements
            </h2>
            <p className="text-admin-body tabular-nums text-admin-ink-muted">
              <span className="font-semibold text-admin-ink">{done}</span> of{" "}
              {total} received
            </p>
          </div>
          <div
            className="mb-4 h-1.5 overflow-hidden rounded-full bg-admin-border"
            role="progressbar"
            aria-label="Requirements received"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
          >
            <div
              className="h-full rounded-full bg-admin-green-700 transition-[width]"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>

          <div className="flex flex-col gap-4">
            {GROUPS.map((group) => {
              const items = application.requirements
                .filter((item) => requirementGroup(item).group === group)
                .sort(byUrgency);
              if (items.length === 0) return null;
              const required = items.filter((item) => item.required);
              const received = required.filter((item) => item.submitted).length;
              const complete = received === required.length;
              const person =
                group === "Bride"
                  ? brideFull
                  : group === "Groom"
                    ? groomFull
                    : null;
              return (
                <AdminFormSection
                  key={group}
                  tone={GROUP_TONE[group]}
                  icon={
                    group === "Bride" || group === "Groom" ? (
                      <span className="font-serif text-admin-body font-bold">
                        {initials(person ?? "")}
                      </span>
                    ) : group === "Couple" ? (
                      <HeartIcon className="h-4 w-4" />
                    ) : (
                      <ChecklistIcon className="h-4 w-4" />
                    )
                  }
                  title={GROUP_HEADING[group]}
                  description={person ?? undefined}
                  right={
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-admin-label font-semibold tabular-nums ${
                        complete
                          ? "bg-admin-green-100 text-admin-green-700"
                          : "bg-admin-amber-100 text-admin-amber-700"
                      }`}
                    >
                      {complete && <CheckIcon className="h-3 w-3" />}
                      {received}/{required.length}
                    </span>
                  }
                  className="mb-0"
                  bodyClassName="py-1"
                >
                  <ul>
                    {items.map((item) => (
                      <RequirementRow
                        key={item.id}
                        item={item}
                        disabled={saving || closed}
                        onChange={(submitted, documentDate) =>
                          run(() =>
                            verifyMarriageRequirement(
                              application.id,
                              item.id,
                              submitted,
                              documentDate,
                            ),
                          )
                        }
                      />
                    ))}
                  </ul>
                </AdminFormSection>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RailCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminFormSection
      tone="neutral"
      icon={icon}
      title={title}
      description={description}
      className="mb-0"
      bodyClassName="py-4"
    >
      {children}
    </AdminFormSection>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 text-admin-body">
      <dt className="text-admin-ink-muted">{label}</dt>
      <dd className="break-words text-admin-ink">{value}</dd>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Bride and groom initials, overlapping, in the same rose and blue as their document cards. */
function CoupleAvatars({ bride, groom }: { bride: string; groom: string }) {
  const circle =
    "flex h-12 w-12 items-center justify-center rounded-full border-2 border-admin-surface font-serif text-admin-body font-bold";
  return (
    <div className="hidden shrink-0 sm:flex" aria-hidden="true">
      <span className={`${circle} bg-[#F8D6E0] text-[#B85A75]`}>
        {initials(bride)}
      </span>
      <span className={`${circle} -ml-3 bg-[#D6EAF8] text-[#2F6FA8]`}>
        {initials(groom)}
      </span>
    </div>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className={className}
      aria-hidden="true"
    >
      <polyline
        points="5 12.5 10 17 19 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RequirementRow({
  item,
  disabled,
  onChange,
}: {
  item: MarriageRequirement;
  disabled: boolean;
  onChange: (submitted: boolean, documentDate?: string) => void;
}) {
  const { label } = requirementGroup(item);
  const missing = !item.submitted;
  // A document that expires asks for the date printed on it before it's marked received.
  const [askingDate, setAskingDate] = useState(false);
  const [docDate, setDocDate] = useState("");
  const stale = item.submitted && (item.expired || item.expiresBeforeWedding);
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-admin-border py-3 first:border-t-0"
      data-missing={(missing && item.required) || undefined}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            item.submitted
              ? "bg-admin-green-700 text-white"
              : item.required
                ? "border-2 border-admin-amber-700/60 bg-admin-amber-100"
                : "border-2 border-dashed border-admin-border-strong"
          }`}
        >
          {item.submitted && <CheckIcon className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0">
          <p className="text-admin-body text-admin-ink">{label}</p>
          {item.note && !item.submitted && <p className="text-admin-support text-admin-ink-muted">{item.note}</p>}
          <p className="text-admin-support text-admin-ink-muted">
            {item.submitted
              ? `Received ${formatReceived(item.verifiedAt)}${item.verifiedByName ? ` · ${item.verifiedByName}` : ""}`
              : item.required
                ? "Not received yet"
                : "Optional"}
            {item.submitted && item.expiresOn && ` · dated ${formatDocDate(item.documentDate)}, good until ${formatDocDate(item.expiresOn)}`}
          </p>
          {stale && (
            <p className="mt-0.5 text-admin-support font-semibold text-admin-red-700">
              {item.expired ? "Expired. Ask for a newer copy." : "Expires before the wedding. Ask for a newer copy."}
            </p>
          )}
        </div>
      </div>
      {item.submitted ? (
        !disabled && (
          <button
            type="button"
            onClick={async () => {
              if (
                await askConfirm({
                  title: `Mark "${item.name}" as not received?`,
                  confirmLabel: "Mark not received",
                })
              )
                onChange(false);
            }}
            className="min-h-[36px] rounded-sm text-admin-support font-semibold text-admin-ink-muted underline hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
          >
            Undo
          </button>
        )
      ) : askingDate ? (
        <div className="flex flex-wrap items-center gap-2">
          <AdminInput
            type="date"
            value={docDate}
            max={todayIso()}
            onChange={(e) => setDocDate(e.target.value)}
            aria-label={`Date on the ${label}`}
            className="w-auto"
          />
          <AdminButton
            type="button"
            size="sm"
            disabled={disabled || !docDate}
            onClick={() => {
              onChange(true, docDate);
              setAskingDate(false);
            }}
          >
            Save
          </AdminButton>
          <button
            type="button"
            onClick={() => setAskingDate(false)}
            className="text-admin-support font-semibold text-admin-ink-muted underline hover:text-admin-ink"
          >
            Cancel
          </button>
        </div>
      ) : (
        <AdminButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => (item.validForDays ? setAskingDate(true) : onChange(true))}
        >
          {item.validForDays ? "Mark received…" : "Mark received"}
        </AdminButton>
      )}
    </li>
  );
}
