// The couple's view of their marriage application: the same six steps the office follows, in their words.
// An application shows here only after the parish office links it to this account.
import { useOutletContext } from "react-router-dom";
import { listMyMarriageApplications } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import {
  applicationStage,
  formatWeddingDate,
  requirementGroup,
  requirementStep,
  statusLabel,
  stepsFor,
  weddingDateOf,
  type StepView,
} from "@/features/parish-admin/marriage-applications/applicationProgress";
import type { MarriageApplication } from "@/features/parish-admin/marriage-applications/types";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";
import { SkeletonList } from "@/components/ui/Skeleton";

export function MyMarriageApplicationPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { data: applications = [], loading } = useAsync(() => listMyMarriageApplications(), []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-[1.75rem] font-bold leading-tight text-ink">Marriage application</h1>
      <p className="mb-6 mt-1 text-sm text-ink-muted">Where your marriage application stands, step by step.</p>

      {loading ? (
        <SkeletonList rows={3} className="px-0" />
      ) : applications.length === 0 ? (
        <NoApplication parish={parish} />
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

/** No application linked yet: how to start one, and who to call to link one already started. */
function NoApplication({ parish }: { parish: Parish }) {
  const phone = parish.contact?.trim();
  const email = parish.email?.trim();
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="font-sans text-[1.0625rem] font-semibold text-ink">No application linked to your account</h2>
      <div className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed text-ink">
        <p>
          <span className="font-semibold">Planning to marry?</span> Visit the parish office together well before
          the date you have in mind. Staff will open your application and go through what you need to bring.
        </p>
        <p>
          <span className="font-semibold">Already applied?</span> Ask the office to link the application to this account,
          and you can follow every step here.
        </p>
      </div>
      {(phone || email) && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {phone && (
            <a
              href={`tel:${phone.replace(/[^d+]/g, "")}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 text-[0.9375rem] font-semibold text-white shadow-[var(--shadow-button)] hover:opacity-90"
            >
              Call {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-surface px-5 text-[0.9375rem] font-semibold text-ink hover:bg-surface-alt"
            >
              Email the office
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app }: { app: MarriageApplication }) {
  const stage = applicationStage(app);
  const closed = stage === "closed";
  const date = weddingDateOf(app);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-bold text-ink">
            {app.groomName} & {app.brideName}
          </h2>
          <p className="text-sm text-ink-muted">Reference {app.referenceNo}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
            app.status === "rejected" ? "bg-[#f6dede] text-[#8a2b2b]" : "bg-[#dbe6ee] text-[#33607e]"
          }`}
        >
          {statusLabel(app)}
        </span>
      </div>

      {!closed && (
        <p className="mt-4 rounded-xl bg-surface-alt px-4 py-3 text-[0.9375rem] text-ink">
          <span className="font-semibold">Next: </span>
          {nextForCouple(app)}
        </p>
      )}

      {app.status !== "rejected" && <Steps steps={stepsFor(app)} />}

      <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
        <dt className="text-ink-muted">Wedding date</dt>
        <dd className="text-ink">
          {date && app.weddingDateStatus !== "none"
            ? `${formatWeddingDate(date)}${app.weddingEvent?.start ? `, ${app.weddingEvent.start}` : ""} · ${
                app.weddingDateStatus === "confirmed" ? "confirmed" : "reserved, not yet confirmed"
              }`
            : "Not reserved yet"}
        </dd>
        {app.dispensationNeeded && (
          <>
            <dt className="text-ink-muted">Dispensation</dt>
            <dd className="text-ink">
              {app.dispensationStatus === "granted"
                ? "Granted"
                : app.dispensationStatus === "denied"
                  ? "Not granted. Please talk to the parish office."
                  : "Waiting for the diocese"}
            </dd>
          </>
        )}
        {app.banns.sundays.length > 0 && app.bannsAnnouncedHere && !app.banns.dispensed && (
          <>
            <dt className="text-ink-muted">Banns</dt>
            <dd className="text-ink">
              {app.banns.sundays.map((d) => formatWeddingDate(d, "short")).join(", ")} ·{" "}
              {app.banns.announced.length} of {app.banns.sundays.length} announced
            </dd>
          </>
        )}
      </dl>

      <Documents app={app} />
    </section>
  );
}

/** The six steps, top to bottom: done, the one they're on, and what comes after. */
function Steps({ steps }: { steps: StepView[] }) {
  return (
    <ol className="mt-5 space-y-2.5">
      {steps.map((step) => (
        <li key={step.key} className="flex items-center gap-3 text-[0.9375rem]">
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
              step.state === "done"
                ? "bg-primary text-white"
                : step.state === "now"
                  ? "border-2 border-primary bg-surface text-primary"
                  : "border border-border bg-surface text-ink-muted"
            }`}
          >
            {step.state === "done" ? "✓" : ""}
          </span>
          <span className={step.state === "todo" ? "text-ink-muted" : "font-semibold text-ink"}>{step.label}</span>
          <span className="sr-only">
            {step.state === "done" ? "done" : step.state === "now" ? "current step" : "to come"}
          </span>
          {step.state === "now" && <span className="text-sm text-primary">You are here</span>}
        </li>
      ))}
    </ol>
  );
}

/** The documents the office has checked, so the couple knows what is still to bring. */
function Documents({ app }: { app: MarriageApplication }) {
  const docs = app.requirements.filter((item) => item.required && requirementStep(item) === "documents");
  if (docs.length === 0) return null;
  return (
    <details className="mt-4 border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        Documents ({docs.filter((d) => d.submitted).length} of {docs.length} checked by the office)
      </summary>
      <ul className="mt-2 space-y-1.5 text-sm">
        {docs.map((item) => {
          const { group, label } = requirementGroup(item);
          return (
            <li key={item.id} className="flex items-start gap-2">
              <span aria-hidden="true" className={item.submitted ? "text-primary" : "text-ink-muted"}>
                {item.submitted ? "✓" : "○"}
              </span>
              <span className={item.submitted ? "text-ink" : "text-ink-muted"}>
                {label}
                {group === "Groom" || group === "Bride" ? ` (${group.toLowerCase()})` : ""}
                <span className="sr-only">{item.submitted ? ", checked" : ", still to bring"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/** What the couple does next, in their words. */
function nextForCouple(app: MarriageApplication) {
  switch (applicationStage(app)) {
    case "documents": {
      const missing = app.requirements.filter(
        (item) => item.required && !item.submitted && requirementStep(item) === "documents"
      );
      if (missing.length === 1) return `Bring your ${requirementGroup(missing[0]).label} to the parish office.`;
      return `Bring the ${missing.length} documents still missing to the parish office. They're listed below.`;
    }
    case "interview":
      return "Your interview with the priest. The parish office will tell you when.";
    case "precana":
      return "Attend the Pre-Cana seminar.";
    case "banns":
      return app.banns.sundays.length > 0
        ? "Your banns are being announced at Sunday Mass."
        : "Your banns will be announced at Sunday Mass on three Sundays.";
    case "date": {
      const date = weddingDateOf(app);
      return app.weddingDateStatus === "reserved" && date
        ? `The parish office will confirm your wedding on ${formatWeddingDate(date)}.`
        : "Choose a wedding date with the parish office.";
    }
    case "cleared":
      return "You're cleared for your wedding. God bless you both!";
    default:
      return "";
  }
}
