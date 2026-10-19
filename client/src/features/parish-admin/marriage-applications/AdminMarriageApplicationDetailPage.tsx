import { useEffect, useState } from "react";
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
import type { DispensationStatus, MarriageApplication } from "@/features/parish-admin/marriage-applications/types";
import { listAssignableStaff } from "@/features/parish-admin/schedule/api/scheduleApi";
import { convert24to12, to24Hour } from "@/features/parish-admin/schedule/scheduleHelpers";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  checking_requirements: "Checking requirements",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

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
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [assignee, setAssignee] = useState("");
  const [rejectRemarks, setRejectRemarks] = useState("");

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const next = await getMarriageApplication(applicationId);
      setApplication(next);
      setNeeded(next.dispensationNeeded);
      setDispStatus(next.dispensationStatus);
      setDispNotes(next.dispensationNotes);
      setDate(next.preferredWeddingDate);
      if (next.preferredWeddingStart) {
        setStart(to24Hour(next.preferredWeddingStart));
        setEnd(to24Hour(next.preferredWeddingEnd || next.preferredWeddingStart));
      }
      setAssignee(next.weddingEvent?.assignee || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this application.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    listAssignableStaff().then(setStaff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  async function run(task: () => Promise<MarriageApplication>) {
    setSaving(true);
    setError("");
    try {
      const next = await task();
      setApplication(next);
      setNeeded(next.dispensationNeeded);
      setDispStatus(next.dispensationStatus);
      setDispNotes(next.dispensationNotes);
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

  const requiredDone = application.requirements.filter((item) => item.required).every((item) => item.submitted);
  const canConfirm =
    application.weddingDateStatus === "reserved" &&
    requiredDone &&
    (!application.dispensationNeeded || application.dispensationStatus === "granted");

  return (
    <div className="mx-auto max-w-[760px]">
      <Link to=".." className="mb-4 inline-block text-admin-support font-semibold text-admin-green-700 hover:underline">
        ← Marriage applications
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-admin-page font-semibold text-admin-ink">
            {application.groomName} & {application.brideName}
          </h1>
          <p className="mt-1 text-admin-body text-admin-ink-muted">Walk-in marriage application</p>
        </div>
        <AdminBadge tone={application.status === "approved" ? "green" : application.status === "rejected" ? "red" : "amber"}>
          {STATUS_LABEL[application.status] || application.status}
        </AdminBadge>
      </div>

      {error && <p className="mb-4 text-admin-support text-admin-red-700">{error}</p>}

      <AdminCard className="mb-4 p-5">
        <h2 className="mb-3 font-serif text-admin-section font-semibold text-admin-ink">Requirements</h2>
        <ul className="space-y-2">
          {application.requirements.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-admin-body text-admin-ink">
                <input
                  type="checkbox"
                  checked={item.submitted}
                  disabled={saving || application.status === "rejected"}
                  onChange={(e) =>
                    run(() => verifyMarriageRequirement(application.id, item.id, e.target.checked))
                  }
                />
                <span>
                  {item.name}
                  {item.required ? "" : " (optional)"}
                </span>
              </label>
              {item.submitted && (
                <span className="text-admin-label text-admin-ink-muted">Verified</span>
              )}
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <h2 className="mb-3 font-serif text-admin-section font-semibold text-admin-ink">Dispensation</h2>
        <label className="mb-3 flex items-center gap-2 text-admin-body text-admin-ink">
          <input type="checkbox" checked={needed} onChange={(e) => setNeeded(e.target.checked)} />
          Dispensation required
        </label>
        {needed && (
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Status" className="mb-0">
              <select
                value={dispStatus}
                onChange={(e) => setDispStatus(e.target.value as DispensationStatus)}
                className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
              >
                <option value="pending">Pending</option>
                <option value="granted">Granted</option>
                <option value="denied">Denied</option>
              </select>
            </AdminField>
            <AdminField label="Notes" className="mb-0">
              <AdminInput value={dispNotes} onChange={(e) => setDispNotes(e.target.value)} />
            </AdminField>
          </div>
        )}
        <AdminButton
          type="button"
          size="sm"
          disabled={saving}
          onClick={() =>
            run(() =>
              updateMarriageDispensation(application.id, {
                dispensationNeeded: needed,
                dispensationStatus: needed ? dispStatus : "none",
                dispensationNotes: dispNotes,
              })
            )
          }
        >
          Save dispensation
        </AdminButton>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <h2 className="mb-3 font-serif text-admin-section font-semibold text-admin-ink">Wedding date</h2>
        <p className="mb-3 text-admin-support text-admin-ink-muted">
          Status: {application.weddingDateStatus === "none" ? "Not reserved" : application.weddingDateStatus}
        </p>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AdminField label="Date" className="mb-0">
            <AdminInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </AdminField>
          <AdminField label="Start" className="mb-0">
            <AdminInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </AdminField>
          <AdminField label="End" className="mb-0">
            <AdminInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </AdminField>
        </div>
        <AdminField label="Assign priest or staff" className="mb-3">
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
          >
            <option value="">Unassigned</option>
            {staff.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </AdminField>
        <div className="flex flex-wrap gap-2">
          <AdminButton
            type="button"
            disabled={saving || !date}
            onClick={() =>
              run(() =>
                reserveWeddingDate(application.id, {
                  date,
                  start: convert24to12(start),
                  end: convert24to12(end),
                  assignee,
                })
              )
            }
          >
            Reserve date
          </AdminButton>
          <AdminButton type="button" disabled={saving || !canConfirm} onClick={() => run(() => confirmWeddingDate(application.id))}>
            Confirm wedding date
          </AdminButton>
        </div>
      </AdminCard>

      {application.status !== "rejected" && application.status !== "approved" && (
        <AdminCard className="p-5">
          <h2 className="mb-3 font-serif text-admin-section font-semibold text-admin-ink">Reject application</h2>
          <AdminField label="Remarks" className="mb-3">
            <AdminInput value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} />
          </AdminField>
          <AdminButton
            type="button"
            variant="secondary"
            disabled={saving || !rejectRemarks.trim()}
            onClick={() => run(() => rejectMarriageApplication(application.id, rejectRemarks.trim()))}
          >
            Reject
          </AdminButton>
        </AdminCard>
      )}
    </div>
  );
}
