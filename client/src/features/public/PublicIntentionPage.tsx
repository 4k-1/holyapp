import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PortalNotice, PortalPending, PortalSuccess } from "@/features/parishioner/components/PortalForm";
import { IntentionForm } from "@/features/parishioner/intentions/IntentionForm";
import { PublicGiveShell } from "@/features/public/PublicGiveShell";
import {
  guestOpenMassSlots,
  guestSubmitIntention,
  guestSyncIntentionDonation,
} from "@/features/public/publicGivingApi";

type Phase = "form" | "checking" | "sent" | "donated";

const THANKS =
  "Thank you. The parish office will confirm your Mass intention and may contact you using the details you gave.";

/** Request a Mass intention without an account; a GCash donation is optional. */
export function PublicIntentionPage() {
  const { parishSlug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const result = searchParams.get("donation");
  const returnedId = searchParams.get("intention");
  const [phase, setPhase] = useState<Phase>(result === "done" && returnedId ? "checking" : "form");
  const [notice, setNotice] = useState<string | null>(
    result === "cancelled"
      ? "The donation was cancelled, so nothing was charged. Your intention is still requested; you don't need to submit it again."
      : null
  );

  // Coming back from GCash: confirm the donation with the server, then tidy the address bar.
  useEffect(() => {
    if (!result || !returnedId) return;
    const clearParams = () => setSearchParams({}, { replace: true });
    if (result === "cancelled") {
      clearParams();
      return;
    }
    guestSyncIntentionDonation(parishSlug, returnedId)
      .then(({ paid }) => {
        if (paid) {
          setPhase("donated");
        } else {
          setNotice("Your intention was received. The donation is still being confirmed by GCash.");
          setPhase("form");
        }
      })
      .catch(() => {
        setNotice("Your intention was received. We couldn't confirm the donation yet.");
        setPhase("form");
      })
      .finally(clearParams);
  }, [result, returnedId, parishSlug, setSearchParams]);

  return (
    <PublicGiveShell
      title="Request a Mass intention"
      description="Offer a Mass for someone: in thanksgiving, for healing, or in memory of a loved one. No account needed, and a donation is welcome but not required."
    >
      {(parish) =>
        phase === "checking" ? (
          <PortalPending>Confirming your donation with GCash…</PortalPending>
        ) : phase === "donated" ? (
          <PortalSuccess title="Your intention and donation were received" to="/give" destination="the giving page">
            {THANKS}
          </PortalSuccess>
        ) : phase === "sent" ? (
          <PortalSuccess title="Your intention was sent" to="/give" destination="the giving page">
            {THANKS}
          </PortalSuccess>
        ) : (
          <>
            {notice && (
              <div className="mb-5">
                <PortalNotice tone="info">{notice}</PortalNotice>
              </div>
            )}
            <IntentionForm
              guest
              parish={parish}
              loadSlots={() => guestOpenMassSlots(parish.slug)}
              submit={(input) => guestSubmitIntention(parish.slug, input)}
              onSubmitted={() => setPhase("sent")}
            />
          </>
        )
      }
    </PublicGiveShell>
  );
}
