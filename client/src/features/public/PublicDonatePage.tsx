import { useEffect, useState } from "react";
import { TestPaymentNotice } from "@/components/payments/TestPaymentNotice";
import { useParams, useSearchParams } from "react-router-dom";
import { PortalNotice, PortalPending, PortalSuccess } from "@/features/parishioner/components/PortalForm";
import { DonationForm } from "@/features/parishioner/donations/DonationForm";
import { PublicGiveShell } from "@/features/public/PublicGiveShell";
import { guestGive, guestGivingOptions, guestSyncDonation } from "@/features/public/publicGivingApi";
import { useAsync } from "@/hooks/useAsync";

type Phase = "form" | "checking" | "received";

/** Give to a parish through GCash without an account. */
export function PublicDonatePage() {
  const { parishSlug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: options } = useAsync(() => guestGivingOptions(parishSlug), [parishSlug]);

  const result = searchParams.get("donation");
  const returnedId = searchParams.get("id");
  const [phase, setPhase] = useState<Phase>(result === "done" && returnedId ? "checking" : "form");
  const [notice, setNotice] = useState<string | null>(
    result === "cancelled" ? "The donation was cancelled. Nothing was charged." : null
  );
  const [amount, setAmount] = useState<number | null>(null);

  // Coming back from GCash: confirm the gift with the server, then tidy the address bar.
  useEffect(() => {
    if (!result || !returnedId) return;
    const clearParams = () => setSearchParams({}, { replace: true });
    if (result === "cancelled") {
      clearParams();
      return;
    }
    guestSyncDonation(parishSlug, returnedId)
      .then(({ paid, donation }) => {
        if (paid) {
          setAmount(donation?.amount ?? null);
          setPhase("received");
        } else {
          setNotice("Your gift is still being confirmed by GCash. It will reach the parish shortly.");
          setPhase("form");
        }
      })
      .catch(() => {
        setNotice("We couldn't confirm your gift yet. If you completed payment, it will reach the parish shortly.");
        setPhase("form");
      })
      .finally(clearParams);
  }, [result, returnedId, parishSlug, setSearchParams]);

  return (
    <PublicGiveShell mode="donate">
      {(parish) =>
        phase === "checking" ? (
          <PortalPending>Confirming your gift with GCash…</PortalPending>
        ) : phase === "received" ? (
          <>
            <PortalSuccess title="Thank you for your gift" to="/give" destination="the giving page">
              {amount !== null
                ? `${parish.name} received your gift of ₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}.`
                : "Your gift was received by the parish."}{" "}
              May God bless your generosity.
            </PortalSuccess>
            <TestPaymentNotice kind="receipt" className="mt-4" />
          </>
        ) : (
          <>
            {notice && (
              <div className="mb-5">
                <PortalNotice tone="info">{notice}</PortalNotice>
              </div>
            )}
            {options ? (
              <DonationForm
                guest
                gcashAvailable={options.gcashDonations}
                onGive={(input) => guestGive(parish.slug, input)}
              />
            ) : (
              <p className="py-10 text-center text-sm text-white/80">Loading…</p>
            )}
          </>
        )
      }
    </PublicGiveShell>
  );
}
