import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { PortalFormPage, PortalNotice } from "@/features/parishioner/components/PortalForm";
import { DonationForm } from "@/features/parishioner/donations/DonationForm";
import { listMyDonations, syncMyDonation, type MyDonation } from "@/features/parishioner/donations/donationsApi";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";

type Notice = { tone: "success" | "info"; text: string } | null;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DonationsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const currentUser = getCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, refetch } = useAsync(() => listMyDonations(), [parish.id]);

  const result = searchParams.get("donation");
  const returnedId = searchParams.get("id");
  const [notice, setNotice] = useState<Notice>(
    result === "cancelled" ? { tone: "info", text: "The donation was cancelled. Nothing was charged." } : null
  );

  // Coming back from GCash: confirm the gift with the server, then tidy the address bar.
  useEffect(() => {
    if (!result || !returnedId) return;
    const clearParams = () => setSearchParams({}, { replace: true });
    if (result === "cancelled") {
      clearParams();
      return;
    }
    syncMyDonation(returnedId)
      .then(({ paid }) => {
        setNotice(
          paid
            ? { tone: "success", text: "Thank you. Your gift was received by the parish." }
            : { tone: "info", text: "Your gift is still being confirmed by GCash. It will show as received shortly." }
        );
        refetch();
      })
      .catch(() => setNotice({ tone: "info", text: "We couldn't confirm your gift yet. Please check again later." }))
      .finally(clearParams);
  }, [result, returnedId, setSearchParams, refetch]);

  const donations = data?.donations ?? [];

  return (
    <PortalFormPage title="Support the parish" description={`Give to ${parish.name} securely through GCash.`}>
      {notice && (
        <div className="mb-5">
          <PortalNotice tone={notice.tone}>{notice.text}</PortalNotice>
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <DonationForm defaultFullName={currentUser?.fullName ?? ""} gcashAvailable={data?.gcashDonations ?? false} />
      )}

      {donations.length > 0 && <GiftHistory donations={donations} />}
    </PortalFormPage>
  );
}

function GiftHistory({ donations }: { donations: MyDonation[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[0.9375rem] font-semibold text-ink">Your gifts</h2>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {donations.map((gift) => (
          <li key={gift.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{gift.purpose ?? "Donation"}</p>
              <p className="text-[0.8125rem] text-ink-muted">
                {formatDate(gift.donationDate)}
                {gift.donorName ? "" : " · Anonymous"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  gift.status === "paid" ? "bg-primary/10 text-primary" : "bg-surface-alt text-ink-muted"
                }`}
              >
                {gift.status === "paid" ? "Received" : "Not completed"}
              </span>
              <span className="w-24 text-right text-sm font-semibold tabular-nums text-ink">
                ₱{gift.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
