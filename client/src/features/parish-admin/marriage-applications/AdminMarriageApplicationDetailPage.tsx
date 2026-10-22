import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
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
import { convert24to12, to24Hour } from "@/features/parish-admin/schedule/scheduleHelpers";

const GROUPS: RequirementGroup[] = ["Bride", "Groom", "Couple", "Preparation"];

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
  const [application, setApplication] = useState<MarriageApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<string[]>([]);
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

  const statusTone = stage === "cleared" ? "green" : application.status === "rejected" ? "red" : closed ? "muted" : "amber";
  const statusLabel = application.status === "rejected" ? "Rejected" : application.status === "completed" ? "Married" : STAGE_LABEL[stage];

  return (
    <div className="mx-auto max-w-[1040px]">
      <Link to=".." className="mb-4 inline-block text-admin-body font-semibold text-admin-green-700 hover:underline">
        ← Marriage applications
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-admin-page font-semibold text-admin-ink">
            {application.brideName} & {application.groomName}
          </h1>
          <p className="mt-1 text-admin-body text-admin-ink-muted">
            {weddingDate
              ? `${application.weddingDateStatus === "confirmed" ? "Wedding" : "Proposed wedding"}: ${formatWeddingDate(weddingDate)}`
              : "No wedding date yet"}
          </p>
        </div>
        <AdminBadge tone={statusTone}>{statusLabel}</AdminBadge>
      </div>

      <AdminCard className="mb-4 px-4 py-5">
        <ol className="grid grid-cols-6" aria-label="Marriage preparation progress">
          {steps.map((step, i) => (
            <li key={step.key} className="relative px-1 text-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-[15px] h-0.5 w-full ${
                    step.state === "done" ? "bg-admin-green-700" : "bg-admin-border"
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
                      : "border-admin-border-strong bg-admin-surface text-admin-ink-faint"
                }`}
              >
                {step.state === "done" ? "✓" : i + 1}
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

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AdminCard className="p-5">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-admin-section font-semibold text-admin-ink">Requirements</h2>
            <p className="text-admin-body tabular-nums text-admin-ink-muted">
              {done} of {total} received
            </p>
          </div>
          {GROUPS.map((group) => {
            const items = application.requirements.filter((item) => requirementGroup(item).group === group);
            if (items.length === 0) return null;
            return (
              <section key={group} className="mt-4">
                <h3 className="mb-1 text-admin-label font-bold uppercase tracking-admin-label text-admin-ink-muted">{group}</h3>
                <ul>
                  {items.map((item) => (
                    <RequirementRow
                      key={item.id}
                      item={item}
                      disabled={saving || closed}
                      onChange={(submitted) =>
                        run(() => verifyMarriageRequirement(application.id, item.id, submitted))
                      }
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </AdminCard>

        <div className="flex flex-col gap-4">
          <SideCard title="Couple">
            <p className="text-admin-body text-admin-ink">
              {fullName(application.brideFirstName, application.brideMiddleName, application.brideLastName)}
            </p>
            <p className="text-admin-body text-admin-ink">
              {fullName(application.groomFirstName, application.groomMiddleName, application.groomLastName)}
            </p>
            {application.remarks && <p className="mt-2 text-admin-support text-admin-ink-muted">{application.remarks}</p>}
          </SideCard>

          <SideCard title="Wedding date">
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
                      <select
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-admin-body text-admin-ink"
                      >
                        <option value="">Not assigned yet</option>
                        {staff.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
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

          <SideCard title="Dispensation">
            {editingDispensation ? (
              <>
                <label className="mb-3 flex min-h-[44px] items-center gap-2.5 text-admin-body text-admin-ink">
                  <input type="checkbox" className="h-5 w-5" checked={needed} onChange={(e) => setNeeded(e.target.checked)} />
                  A dispensation is needed
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
                    className="mt-2 min-h-[44px] text-admin-body font-semibold text-admin-green-700 hover:underline"
                  >
                    {application.dispensationNeeded ? "Update dispensation" : "Mark as needed"}
                  </button>
                )}
              </>
            )}
          </SideCard>
        </div>
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
                  onClick={() => {
                    if (!window.confirm(`Reject the application of ${application.groomName} & ${application.brideName}?`)) return;
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
                className="min-h-[44px] font-semibold text-admin-red-700 hover:underline"
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

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AdminCard className="p-5">
      <h2 className="mb-2 font-serif text-admin-group font-semibold text-admin-ink">{title}</h2>
      {children}
    </AdminCard>
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
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-border py-2.5">
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
              onClick={() => {
                if (window.confirm(`Mark "${item.name}" as not received?`)) onChange(false);
              }}
              className="min-h-[36px] text-admin-support font-semibold text-admin-ink-muted underline hover:text-admin-ink"
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
