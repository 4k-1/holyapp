import { Link, useOutletContext } from "react-router-dom";
import { listMyMarriageApplications } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";
import { SkeletonList } from "@/components/ui/Skeleton";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  checking_requirements: "Checking requirements",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

export function MyMarriageApplicationPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { data: applications = [], loading } = useAsync(() => listMyMarriageApplications(), []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-[26px] font-bold text-ink">Marriage Application</h1>
      <p className="mb-6 mt-1 text-sm text-ink-muted">
        Status of marriage applications the parish office filed for you.
      </p>

      {loading ? (
        <SkeletonList rows={3} className="px-0" />
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-ink-muted">
          No marriage application is on file for your account. Visit the parish office to apply in person.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((app) => {
            const required = app.requirements.filter((item) => item.required);
            const done = required.filter((item) => item.submitted).length;
            return (
              <div key={app.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-serif text-lg font-bold text-ink">
                    {app.groomName} & {app.brideName}
                  </p>
                  <span className="rounded-full bg-[#dbe6ee] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#33607e]">
                    {STATUS_LABEL[app.status] || app.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  Requirements {done} of {required.length} verified
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  {app.requirements.map((item) => (
                    <li key={item.id}>
                      {item.submitted ? "✓" : "○"} {item.name}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-ink-muted">
                  Dispensation:{" "}
                  {app.dispensationNeeded
                    ? app.dispensationStatus === "granted"
                      ? "Granted"
                      : app.dispensationStatus === "denied"
                        ? "Denied"
                        : "Pending"
                    : "Not required"}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Wedding date:{" "}
                  {app.preferredWeddingDate
                    ? `${app.preferredWeddingDate} ${app.preferredWeddingStart} · ${app.weddingDateStatus}`
                    : "Not reserved yet"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Link to={`/${parish.slug}/portal`} className="mt-6 inline-block text-sm font-semibold text-ink-muted hover:underline">
        ← Dashboard
      </Link>
    </div>
  );
}
