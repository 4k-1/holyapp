import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { ArrowLeftIcon, CalendarIcon, HeartIcon } from "@/components/ui/icons/AdminIcons";
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
  updateMarriageDispensation,
  verifyMarriageRequirement,
} from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import {
  STAGE_LABEL,
  applicationStage,
  formatWeddingDate,
  nextStep,
  requirementGroup,
  requirementProgress,
  stepsFor,
  weddingDateOf,
  type RequirementGroup,
} from "@/features/parish-admin/marriage-applications/applicationProgress";
import type {
  DispensationStatus,
  MarriageApplication,
  MarriageRequirement,
} from "@/features/parish-admin/marriage-applications/types";
import { listAssignableStaff } from "@/features/parish-admin/schedule/api/scheduleApi";
import { StaffSelect } from "@/features/parish-admin/schedule/components/StaffSelect";
import type { AssignableStaff } from "@/features/parish-admin/schedule/types";
import { convert24to12, to24Hour } from "@/features/parish-admin/schedule/scheduleHelpers";
import { askConfirm } from "@/lib/notify";

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

const DISPENSATION_LABEL: Record<DispensationStatus, string> = {
  none: "Not needed",
  pending: "Pending",
  granted: "Granted",
  denied: "Denied",
};

function formatReceived(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullName(first: string, middle: string, last: string) {
  return [first, middle, last].filter(Boolean).join(" ");
}

export function AdminMarriageApplicationDetailPage() {
  const { applicationId = "" } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<MarriageApplication | null>(null);
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
  const [assignee, setAssignee] = useState("");
  const [editingDate, setEditingDate] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");

  function fillFrom(next: MarriageApplication) {
    setApplication(next);
    setNeeded(next.dispensationNeeded);
    setDispStatus(next.dispensationNeeded && next.dispensationStatus === "none" ? "pending" : next.dispensationStatus);
    setDispNotes(next.dispensationNotes);
    setDate(weddingDateOf(next));
    const from = next.weddingEvent?.start || next.preferredWeddingStart;
    const to = next.weddingEvent?.end || next.preferredWeddingEnd;
    if (from) {
      setStart(to24Hour(from));
      setEnd(to24Hour(to || from));
    }
    setAssignee(next.weddingEvent?.assignee || "");
  }

  const fetchApplication = useCallback(
    () =>
      getMarriageApplication(applicationId)
        .then(fillFrom)
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Couldn't load this application.");
        })
        .finally(() => {
          setLoading(false);
        }),
    [applicationId]
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

  async function run(task: () => Promise<MarriageApplication>, after?: () => void) {
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
  const currentStepKey = application ? stepsFor(application).find((step) => step.state === "now")?.key : undefined;
  useEffect(() => {
    const box = stepperRef.current;
    const now = box?.querySelector<HTMLElement>("[data-current-step]");
    if (!box || !now || box.scrollWidth <= box.clientWidth) return;
    const boxRect = box.getBoundingClientRect();
    const nowRect = now.getBoundingClientRect();
    box.scrollLeft += nowRect.left - boxRect.left - (boxRect.width - nowRect.width) / 2;
  }, [currentStepKey]);

  if (loading && !application) {
    return <p className="text-admin-body text-admin-ink-muted">Loading application…</p>;
  }
  if (!application) {
    return <p className="text-admin-body text-admin-ink-muted">{error || "Application not found."}</p>;
  }

  const stage = applicationStage(application);
  const closed = stage === "closed";
  const { done, total, missing } = requirementProgress(application);
  const weddingDate = weddingDateOf(application);
  const dispensationBlocks = application.dispensationNeeded && application.dispensationStatus !== "granted";
  const confirmBlocker =
    application.weddingDateStatus !== "reserved"
      ? "Reserve a date first."
      : missing.length > 0
        ? `Can't confirm yet: ${missing.length} document${missing.length === 1 ? "" : "s"} still missing.`
        : dispensationBlocks
          ? "Can't confirm yet: the dispensation isn't granted."
          : "";

  const steps = stepsFor(application);
  const brideFull = fullName(application.brideFirstName, application.brideMiddleName, application.brideLastName);
  const groomFull = fullName(application.groomFirstName, application.groomMiddleName, application.groomLastName);

  const statusTone = stage === "cleared" ? "green" : application.status === "rejected" ? "red" : "muted";
  const statusLabel = application.status === "rejected" ? "Rejected" : application.status === "completed" ? "Married" : STAGE_LABEL[stage];

  return (
    <div className="mx-auto max-w-[1040px]">
      <button
        type="button"
        onClick={() => {
          // React Router numbers history entries; idx 0 means this page was opened directly, so fall back to the list.
          if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
          else navigate("..", { relative: "path" });
        }}
        className="mb-3.5 inline-flex min-h-[44px] items-center gap-1.5 rounded-md text-admin-body text-admin-ink-muted hover:text-admin-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <AdminCard className="mb-4 flex flex-wrap items-start justify-between gap-4 p-5 sm:p-[26px] sm:px-7">
        <div className="min-w-0">
          <h1 className="sr-only">
            Marriage application of {brideFull} and {groomFull}
          </h1>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2" aria-hidden="true">
            <PersonName role="Bride" name={brideFull} />
            <span className="pb-0.5 font-serif text-admin-page text-admin-ink-faint">&amp;</span>
            <PersonName role="Groom" name={groomFull} />
          </div>
          <p className="mt-2 text-admin-body text-admin-ink-muted">
            {weddingDate
              ? `${application.weddingDateStatus === "confirmed" ? "Wedding" : "Proposed wedding"}: ${formatWeddingDate(weddingDate)}`
              : "No wedding date yet"}
          </p>
          {application.remarks && <p className="mt-1 text-admin-body text-admin-ink-muted">Remarks: {application.remarks}</p>}
        </div>
        <AdminBadge tone={statusTone}>{statusLabel}</AdminBadge>
      </AdminCard>

      <AdminCard className="mb-4 px-4 py-5">
        <div ref={stepperRef} className="-mx-1 overflow-x-auto pb-1">
        <ol className="grid min-w-[560px] grid-cols-6" aria-label="Marriage preparation progress">
          {steps.map((step, i) => (
            <li key={step.key} className="relative px-1 text-center" data-current-step={step.state === "now" || undefined}>
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-[15px] h-0.5 w-full ${
                    step.state === "done" && steps[i - 1].state === "done" ? "bg-admin-green-700" : "bg-admin-border"
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-admin-support font-bold ${
                  step.state === "done"
                    ? "border-admin-green-700 bg-admin-green-700 text-white"
                    : step.state === "now"
                      ? "border-admin-gold-600 bg-admin-gold-100 text-admin-gold-700"
                      : "border-admin-border-strong bg-admin-surface text-admin-ink-muted"
                }`}
              >
                {step.state === "done" ? <CheckIcon className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`mt-2 block text-admin-support leading-snug ${
                  step.state === "now" ? "font-semibold text-admin-ink" : step.state === "done" ? "text-admin-ink" : "text-admin-ink-muted"
                }`}
              >
                {step.label}
              </span>
              {step.state === "now" && (
                <span className="mt-0.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-gold-700">
                  Now
                </span>
              )}
              <span className="sr-only">{step.state === "done" ? " (done)" : step.state === "now" ? " (current step)" : ""}</span>
            </li>
          ))}
        </ol>
        </div>
      </AdminCard>

      <div
        className={`mb-5 rounded-lg border px-4 py-3 text-[1.0625rem] ${
          closed ? "border-admin-border bg-admin-surface-alt text-admin-ink-muted" : "border-admin-gold-600/40 bg-admin-gold-100/50 text-admin-ink"
        }`}
        role="status"
      >
        <span className="font-semibold">Next:</span> {nextStep(application, true)}
        {stage === "cleared" && (
          <Link to="../../records/marriage/new" relative="path" className="ml-2 font-semibold text-admin-green-700 underline">
            Open marriage register
          </Link>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-admin-red-100 px-4 py-3 text-admin-body font-semibold text-admin-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-admin-section font-semibold text-admin-ink">Requirements</h2>
        <p className="text-admin-body tabular-nums text-admin-ink-muted">
          {done} of {total} received
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GROUPS.map((group) => {
          const items = application.requirements.filter((item) => requirementGroup(item).group === group);
          if (items.length === 0) return null;
          const person = group === "Bride" ? brideFull : group === "Groom" ? groomFull : null;
          return (
            <AdminFormSection
              key={group}
              tone={GROUP_TONE[group]}
              icon={
                group === "Bride" || group === "Groom" ? (
                  <span className="font-serif text-admin-body font-bold">{initials(person ?? "")}</span>
                ) : group === "Couple" ? (
                  <HeartIcon className="h-4 w-4" />
                ) : (
                  <ChecklistIcon className="h-4 w-4" />
                )
              }
              title={GROUP_HEADING[group]}
              description={person ?? undefined}
              className="mb-0 h-full"
              bodyClassName="py-1"
            >
              <ul>
                {items.map((item) => (
                  <RequirementRow
                    key={item.id}
                    item={item}
                    disabled={saving || closed}
                    onChange={(submitted) => run(() => verifyMarriageRequirement(application.id, item.id, submitted))}
                  />
                ))}
              </ul>
            </AdminFormSection>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SideCard title="Wedding date" icon={<CalendarIcon className="h-4 w-4" />}>
            {weddingDate && application.weddingDateStatus !== "none" ? (
              <>
                <p className="text-admin-body font-semibold text-admin-ink">{formatWeddingDate(weddingDate)}</p>
                {application.weddingEvent && (
                  <p className="text-admin-body text-admin-ink-muted">
                    {application.weddingEvent.start} – {application.weddingEvent.end}
                    {application.weddingEvent.assignee ? ` · ${application.weddingEvent.assignee}` : ""}
                  </p>
                )}
                <div className="my-2.5">
                  {application.weddingDateStatus === "confirmed" ? (
                    <AdminBadge tone="green">Confirmed</AdminBadge>
                  ) : (
                    <AdminBadge tone="amber">Reserved, not confirmed</AdminBadge>
                  )}
                </div>
              </>
            ) : (
              <p className="mb-2.5 text-admin-body text-admin-ink-muted">No date reserved yet.</p>
            )}

            {!closed && application.weddingDateStatus !== "confirmed" && (
              <>
                {application.weddingDateStatus === "reserved" && (
                  <>
                    <AdminButton
                      type="button"
                      className="w-full"
                      disabled={saving || Boolean(confirmBlocker)}
                      onClick={() => run(() => confirmWeddingDate(application.id))}
                    >
                      Confirm wedding
                    </AdminButton>
                    {confirmBlocker && <p className="mt-1.5 text-admin-support text-admin-ink-muted">{confirmBlocker}</p>}
                  </>
                )}

                {editingDate ? (
                  <div className="mt-3 border-t border-admin-border pt-3">
                    <AdminField label="Date">
                      <AdminInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </AdminField>
                    <div className="grid grid-cols-2 gap-3">
                      <AdminField label="Start">
                        <AdminInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                      </AdminField>
                      <AdminField label="End">
                        <AdminInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
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
                    <div className="flex justify-end gap-2">
                      <AdminButton type="button" variant="secondary" onClick={() => setEditingDate(false)} disabled={saving}>
                        Cancel
                      </AdminButton>
                      <AdminButton
                        type="button"
                        disabled={saving || !date || !start || !end || start >= end}
                        onClick={() =>
                          run(
                            () =>
                              reserveWeddingDate(application.id, {
                                date,
                                start: convert24to12(start),
                                end: convert24to12(end),
                                assignee,
                              }),
                            () => setEditingDate(false)
                          )
                        }
                      >
                        Reserve date
                      </AdminButton>
                    </div>
                  </div>
                ) : (
                  <AdminButton
                    type="button"
                    variant="secondary"
                    className="mt-2 w-full"
                    onClick={() => setEditingDate(true)}
                  >
                    {application.weddingDateStatus === "reserved" ? "Change date" : "Reserve a date"}
                  </AdminButton>
                )}
              </>
            )}
          </SideCard>

          <SideCard
            title="Dispensation"
            icon={<FileIcon className="h-4 w-4" />}
            description="Special permission from the diocese. Only some marriages need it, for example when the bride or groom isn't a baptized Catholic."
          >
            {editingDispensation ? (
              <>
                <label className="mb-3 flex min-h-[44px] items-center gap-2.5 text-admin-body text-admin-ink">
                  <input type="checkbox" className="h-5 w-5" checked={needed} onChange={(e) => setNeeded(e.target.checked)} />
                  This marriage needs a dispensation
                </label>
                {needed && (
                  <>
                    <AdminField label="Status">
                      <select
                        value={dispStatus === "none" ? "pending" : dispStatus}
                        onChange={(e) => setDispStatus(e.target.value as DispensationStatus)}
                        className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-admin-body text-admin-ink"
                      >
                        <option value="pending">Pending</option>
                        <option value="granted">Granted</option>
                        <option value="denied">Denied</option>
                      </select>
                    </AdminField>
                    <AdminField label="Notes">
                      <AdminInput value={dispNotes} onChange={(e) => setDispNotes(e.target.value)} />
                    </AdminField>
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <AdminButton type="button" variant="secondary" onClick={() => setEditingDispensation(false)} disabled={saving}>
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
                            dispensationStatus: needed ? (dispStatus === "none" ? "pending" : dispStatus) : "none",
                            dispensationNotes: needed ? dispNotes : "",
                          }),
                        () => setEditingDispensation(false)
                      )
                    }
                  >
                    Save
                  </AdminButton>
                </div>
              </>
            ) : (
              <>
                {application.dispensationNeeded ? (
                  <>
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
                    {application.dispensationNotes && (
                      <p className="mt-2 text-admin-body text-admin-ink-muted">{application.dispensationNotes}</p>
                    )}
                  </>
                ) : (
                  <p className="text-admin-body text-admin-ink-muted">Not needed</p>
                )}
                {!closed && (
                  <button
                    type="button"
                    onClick={() => setEditingDispensation(true)}
                    className="mt-2 min-h-[44px] text-admin-body font-semibold text-admin-green-700 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
                  >
                    {application.dispensationNeeded ? "Update dispensation" : "Mark as needed"}
                  </button>
                )}
              </>
            )}
          </SideCard>
      </div>

      {!closed && stage !== "cleared" && (
        <div className="mt-6 border-t border-admin-border pt-4">
          {rejecting ? (
            <AdminCard className="max-w-[560px] p-5">
              <h2 className="mb-1 font-serif text-admin-section font-semibold text-admin-ink">Reject this application</h2>
              <p className="mb-3 text-admin-body text-admin-ink-muted">This closes the application. It can&apos;t be undone.</p>
              <AdminField label="Reason">
                <AdminInput value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} />
              </AdminField>
              <div className="flex justify-end gap-2">
                <AdminButton type="button" variant="secondary" onClick={() => setRejecting(false)} disabled={saving}>
                  Cancel
                </AdminButton>
                <AdminButton
                  type="button"
                  disabled={saving || !rejectRemarks.trim()}
                  onClick={async () => {
                    const ok = await askConfirm({
                      title: "Reject this application?",
                      message: `The application of ${application.groomName} & ${application.brideName} will be closed.`,
                      confirmLabel: "Reject application",
                      danger: true,
                    });
                    if (!ok) return;
                    run(() => rejectMarriageApplication(application.id, rejectRemarks.trim()), () => setRejecting(false));
                  }}
                >
                  Reject application
                </AdminButton>
              </div>
            </AdminCard>
          ) : (
            <p className="text-admin-body text-admin-ink-muted">
              Other actions:{" "}
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="min-h-[44px] font-semibold text-admin-red-700 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
              >
                Reject application…
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SideCard({
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
    <AdminFormSection tone="neutral" icon={icon} title={title} description={description} className="mb-0 h-full">
      {children}
    </AdminFormSection>
  );
}

/** Text colours of the rose and blue section tones in AdminForm, so the role tags match their document cards. */
const ROLE_COLOR = { Bride: "text-[#B85A75]", Groom: "text-[#2F6FA8]" } as const;

function initials(name: string) {
  return name
    .split(/s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className} aria-hidden="true">
      <polyline points="5 12.5 10 17 19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonName({ role, name }: { role: "Bride" | "Groom"; name: string }) {
  return (
    <div>
      <p className={`text-admin-label font-bold uppercase tracking-admin-label ${ROLE_COLOR[role]}`}>{role}</p>
      <p className="font-serif text-admin-page font-semibold leading-tight text-admin-ink">{name}</p>
    </div>
  );
}

function RequirementRow({
  item,
  disabled,
  onChange,
}: {
  item: MarriageRequirement;
  disabled: boolean;
  onChange: (submitted: boolean) => void;
}) {
  const { label } = requirementGroup(item);
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-admin-border py-3 first:border-t-0">
      <span className="text-admin-body text-admin-ink">
        {label}
        {!item.required && <span className="text-admin-ink-muted"> (optional)</span>}
      </span>
      {item.submitted ? (
        <span className="flex flex-wrap items-center gap-2.5">
          <span className="text-admin-support text-admin-ink-muted">
            {formatReceived(item.verifiedAt)}
            {item.verifiedByName ? ` · ${item.verifiedByName}` : ""}
          </span>
          <AdminBadge tone="green">Received</AdminBadge>
          {!disabled && (
            <button
              type="button"
              onClick={async () => {
                if (await askConfirm({ title: `Mark "${item.name}" as not received?`, confirmLabel: "Mark not received" }))
                  onChange(false);
              }}
              className="min-h-[36px] text-admin-support font-semibold text-admin-ink-muted underline hover:text-admin-ink rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
            >
              Undo
            </button>
          )}
        </span>
      ) : (
        <AdminButton type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => onChange(true)}>
          Mark received
        </AdminButton>
      )}
    </li>
  );
}
