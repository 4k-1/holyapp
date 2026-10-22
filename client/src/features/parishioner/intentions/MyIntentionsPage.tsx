import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { listMassIntentions, syncIntentionDonation } from "@/features/parishioner/intentions/intentionsApi";
import { useAsync } from "@/hooks/useAsync";
import { IntentionCard } from "@/features/parishioner/intentions/components/IntentionCard";
import type { Parish } from "@/types";

type Notice = { tone: "success" | "info"; text: string } | null;

export function MyIntentionsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: intentions = [], loading, refetch } = useAsync(
    () => (user ? listMassIntentions(parish.id, user.id) : Promise.resolve([])),
    [parish.id, user?.id]
  );

  const donationResult = searchParams.get("donation");
  const returnedIntention = searchParams.get("intention");
  const justSubmitted = searchParams.get("submitted") === "1";
  const [notice, setNotice] = useState<Notice>(
    justSubmitted
      ? { tone: "success", text: "Your intention was sent to the parish office." }
      : donationResult === "cancelled"
        ? { tone: "info", text: "The donation was cancelled. Your intention is still requested." }
        : null
  );

  // Coming back from GCash: confirm the donation with the server, then tidy the address bar.
  useEffect(() => {
    if (justSubmitted) {
      setSearchParams({}, { replace: true });
      return;
    }
    if (!donationResult || !returnedIntention) return;
    const clearParams = () => setSearchParams({}, { replace: true });
    if (donationResult === "cancelled") {
      clearParams();
      return;
    }
    syncIntentionDonation(returnedIntention)
      .then(({ paid }) => {
        setNotice(
          paid
            ? { tone: "success", text: "Thank you. Your intention and donation were received." }
            : { tone: "info", text: "Your intention was received. The donation is still being confirmed by GCash." }
        );
        refetch();
      })
      .catch(() => {
        setNotice({ tone: "info", text: "Your intention was received. We couldn't confirm the donation yet." });
      })
      .finally(clearParams);
  }, [justSubmitted, donationResult, returnedIntention, setSearchParams, refetch]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[26px] font-bold text-ink">My Mass Intentions</h1>
        <Link
          to={`/${parish.slug}/portal/intention`}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90"
        >
          + New Intention
        </Link>
      </div>

      {notice && (
        <p
          role="status"
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
            notice.tone === "success" ? "border-primary/30 bg-primary/10 text-ink" : "border-border bg-surface-alt text-ink"
          }`}
        >
          {notice.text}
        </p>
      )}

      {loading && intentions.length === 0 ? (
        <p className="text-sm text-ink-muted">Loading your intentions…</p>
      ) : intentions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-ink-muted">
          You haven&apos;t requested any Mass intentions yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {intentions.map((intention) => (
            <IntentionCard key={intention.id} intention={intention} />
          ))}
        </div>
      )}
    </div>
  );
}
