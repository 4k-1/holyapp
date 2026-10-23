import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { listRequests } from "@/features/parishioner/requests/api/requestsApi";
import { listMyMarriageApplications } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import { useAsync } from "@/hooks/useAsync";
import { deriveStatusLabel } from "@/features/parishioner/dashboard/deriveStatusLabel";
import { getStatusPillClasses, getSacramentIconStyle } from "@/features/parishioner/dashboard/statusStyles";
import { DropletIcon, DoveIcon, HeartIcon, CandleIcon, GiveIcon, IntentionIcon } from "@/components/ui/icons/SacramentIcons";
import type { SacramentType } from "@/types";

const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Certificate of Baptism",
  confirmation: "Certificate of Confirmation",
  marriage: "Certificate of Marriage",
  death: "Certificate of Death",
};

const sacramentIcons: Record<SacramentType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  baptism: DropletIcon,
  confirmation: DoveIcon,
  marriage: HeartIcon,
  death: CandleIcon,
};

interface DashboardPageProps {
  parishId: string;
  parishSlug: string;
  userName: string;
}

export function DashboardPage({ parishId, parishSlug, userName }: DashboardPageProps) {
  const { data: requests = [] } = useAsync(() => listRequests(parishId), [parishId]);
  const { data: marriageApps = [] } = useAsync(() => listMyMarriageApplications(), [parishId]);
  const hasRequests = requests.length > 0;
  const recentRequests = requests.slice(0, 4);
  const newRequestPath = `/${parishSlug}/portal/requests/new`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="relative mb-6 overflow-hidden rounded-[22px] bg-gradient-to-br from-primary to-primary/85 p-8 text-white shadow-lg">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(230,204,143,0.18), transparent 70%)" }}
        />
        <h1 className="relative font-serif text-[22px] font-semibold sm:text-[25px] md:text-[29px]">
          Welcome back, {userName}
        </h1>
        <p className="relative mt-1.5 text-sm text-white/80">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="mb-6 rounded-[18px] border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">My Certificate Requests</h2>
          {hasRequests && (
            <Link
              to={`/${parishSlug}/portal/requests`}
              className="shrink-0 text-sm font-semibold text-ink-muted hover:underline"
            >
              View all →
            </Link>
          )}
        </div>

        {hasRequests ? (
          <div className="flex flex-col divide-y divide-border">
            {recentRequests.map((request) => (
              <div key={request.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
                {(() => {
                  const Icon = sacramentIcons[request.sacramentType];
                  return (
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getSacramentIconStyle(request.sacramentType)}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">
                    {sacramentLabels[request.sacramentType]}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Requested{" "}
                    {new Date(request.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${getStatusPillClasses(
                    request
                  )}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {deriveStatusLabel(request)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface-alt px-5 py-8 text-center">
            <p className="text-sm text-ink-muted">
              No certificate requests yet. Start with a baptism, confirmation, marriage, or death certificate.
            </p>
            <Link
              to={newRequestPath}
              className="mt-4 inline-block rounded-[11px] bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:opacity-95 active:scale-95"
            >
              Make a request
            </Link>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-[18px] border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">Marriage Application</h2>
          <Link
            to={`/${parishSlug}/portal/marriage`}
            className="shrink-0 text-sm font-semibold text-ink-muted hover:underline"
          >
            View status →
          </Link>
        </div>
        {marriageApps.length > 0 ? (
          <p className="text-sm text-ink-muted">
            {marriageApps[0].groomName} & {marriageApps[0].brideName} · {marriageApps[0].status.replaceAll("_", " ")}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            No application is on file for your account. Visit the parish office to apply in person.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ActionCard
          icon={<GiveIcon className="h-5 w-5" />}
          title="Support the parish"
          body="Your gift sustains the santuario, its outreach, and the sacramental life of our community."
          to={`/${parishSlug}/portal/donate`}
          action="Give online"
        />
        <ActionCard
          icon={<IntentionIcon className="h-5 w-5" />}
          title="Request a Mass intention"
          body="Offer a Mass for thanksgiving, healing, or in loving memory of someone dear to you."
          to={`/${parishSlug}/portal/intention`}
          action="Request an intention"
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  body,
  to,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  to: string;
  action: string;
}) {
  return (
    <div className="flex flex-col rounded-[18px] border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">{icon}</div>
      <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-muted">{body}</p>
      <Link
        to={to}
        className="mt-5 inline-flex min-h-[44px] w-fit items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        {action}
      </Link>
    </div>
  );
}
