import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { deriveStatusLabel, deriveStatusTone } from "@/features/parishioner/dashboard/deriveStatusLabel";
import type { SacramentType } from "@/types";

const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Certificate of Baptism",
  confirmation: "Certificate of Confirmation",
  marriage: "Certificate of Marriage",
  death: "Certificate of Death",
};

interface DashboardPageProps {
  parishSlug: string;
  userName: string;
}

export function DashboardPage({ parishSlug, userName }: DashboardPageProps) {
  const recentRequests = MOCK_REQUESTS.slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Welcome banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Welcome back</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">Good morning, {userName}</h1>
      </div>

      {/* Requests card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Certificate Requests</CardTitle>
          <Link
            to={`/${parishSlug}/portal/requests`}
            className="text-sm font-medium text-accent hover:underline"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {recentRequests.map((request) => (
            <div key={request.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                ✦
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{sacramentLabels[request.sacramentType]}</p>
                <p className="text-xs text-ink-muted">
                  Requested {new Date(request.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge tone={deriveStatusTone(request)}>{deriveStatusLabel(request)}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Promo cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Give Back</p>
          <h3 className="mt-2 font-serif text-xl font-semibold">Support the Parish</h3>
          <p className="mt-2 max-w-xs text-sm text-white/80">
            Your offering helps sustain the santuario, its outreach, and the sacramental life of our community.
          </p>
          <Button variant="accent" className="mt-4">
            Donate Now
          </Button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Offer a Prayer</p>
          <h3 className="mt-2 font-serif text-xl font-semibold">Request a Mass Intention</h3>
          <p className="mt-2 max-w-xs text-sm text-white/80">
            Offer a Mass for thanksgiving, healing, or in loving memory of someone dear to you.
          </p>
          <Button variant="accent" className="mt-4">
            Request Intention
          </Button>
        </div>
      </div>
    </div>
  );
}