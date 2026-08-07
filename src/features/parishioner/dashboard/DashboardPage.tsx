import { Link } from "react-router-dom";
import { listRequests } from "@/features/parishioner/requests/api/requestsApi";
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
  const recentRequests = requests.slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="relative mb-6 overflow-hidden rounded-[22px] bg-gradient-to-br from-primary to-primary/85 p-8 text-white shadow-lg">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(230,204,143,0.18), transparent 70%)" }}
        />
        <p className="relative text-xs font-semibold uppercase tracking-wide text-accent">Welcome back</p>
        <h1 className="relative mt-2 font-serif text-[22px] font-semibold sm:text-[25px] md:text-[29px]">
          Good morning, {userName} <span aria-hidden="true">🕊</span>
        </h1>
      </div>  

      <div className="mb-6 rounded-[18px] border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-ink">My Certificate Requests</h2>
          <Link
            to={`/${parishSlug}/portal/requests`}
            className="flex items-center gap-1 text-sm font-semibold text-ink-muted hover:underline"
          >
            View all →
          </Link>
        </div>

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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-primary to-primary/85 p-6 text-white shadow-sm">
          <div
            className="pointer-events-none absolute -right-9 -top-9 h-[150px] w-[150px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(230,204,143,0.18), transparent 70%)" }}
          />
         <div className="relative z-10 mb-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-accent/15 text-accent">
            <GiveIcon className="h-6 w-6" />
          </div>
          <p className="relative z-10 text-xs font-semibold uppercase tracking-wide text-accent">Give Back</p>
          <h3 className="relative z-10 mt-1 font-serif text-xl font-semibold">Support the Parish</h3>
          <p className="relative z-10 mt-2 max-w-xs text-[13.5px] leading-relaxed text-white/80">
            Your offering helps sustain the santuario, its outreach, and the sacramental life of our community.
          </p>
          <Link
            to={`/${parishSlug}/portal/donate`}
            className="relative z-10 mt-4 inline-block rounded-[11px] bg-[#1e3a2b] px-6 py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
          >
            Donate Now
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-primary to-primary/85 p-6 text-white shadow-sm">
          <div
            className="pointer-events-none absolute -right-9 -top-9 h-[150px] w-[150px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(230,204,143,0.18), transparent 70%)" }}
          />

        <div className="relative z-10 mb-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-accent/15 text-accent">
          <IntentionIcon className="h-6 w-6" />
        </div>
          <p className="relative z-10 text-xs font-semibold uppercase tracking-wide text-accent">Offer a Prayer</p>
          <h3 className="relative z-10 mt-1 font-serif text-xl font-semibold">Request a Mass Intention</h3>
          <p className="relative z-10 mt-2 max-w-xs text-[13.5px] leading-relaxed text-white/80">
            Offer a Mass for thanksgiving, healing, or in loving memory of someone dear to you.
          </p>
          <Link
            to={`/${parishSlug}/portal/intention`}
            className="relative z-10 mt-4 inline-block rounded-[11px] bg-[#1e3a2b] px-6 py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
          >
            Request Intention
          </Link>
        </div>
      </div>
    </div>
  );
}