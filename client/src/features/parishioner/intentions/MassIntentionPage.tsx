import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import {
  PortalFormPage,
  PortalNotice,
  PortalPending,
  PortalSuccess,
} from "@/features/parishioner/components/PortalForm";
import { IntentionForm } from "@/features/parishioner/intentions/IntentionForm";
import { syncIntentionDonation } from "@/features/parishioner/intentions/intentionsApi";
import type { Parish } from "@/types";

/**
 * "checking" while GCash confirms a returning donation. "sent" (no donation) and "donated" (donation received)
 * replace the form with a thank-you screen.
 */
type Phase = "form" | "checking" | "sent" | "donated";

const DESCRIPTION =
  "Offer a Mass for someone: in thanksgiving, for healing, or in memory of a loved one. A donation is welcome but not required.";

export function MassIntentionPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const currentUser = getCurrentUser();
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
    syncIntentionDonation(returnedId)
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
  }, [result, returnedId, setSearchParams]);

  const dashboard = `/${parish.slug}/portal`;

  return (
    <PortalFormPage title="Offer a Mass" description={DESCRIPTION} back={{ to: "../intentions", label: "My Mass intentions" }}>
      {phase === "checking" ? (
        <PortalPending>Confirming your donation with GCash…</PortalPending>
      ) : phase === "donated" ? (
        <PortalSuccess title="Your intention and donation were received" to={dashboard}>
          Thank you. The parish office will confirm your Mass intention, and you can follow it under My Mass intentions.
        </PortalSuccess>
      ) : phase === "sent" ? (
        <PortalSuccess title="Your intention was sent" to={dashboard}>
          Thank you. The parish office will confirm your Mass intention, and you can follow it under My Mass intentions.
        </PortalSuccess>
      ) : (
        <>
          {notice && (
            <div className="mb-5">
              <PortalNotice tone="info">{notice}</PortalNotice>
            </div>
          )}
          <IntentionForm
            parish={parish}
            defaultRequestedBy={currentUser?.fullName ?? ""}
            onSubmitted={() => setPhase("sent")}
          />
        </>
      )}
    </PortalFormPage>
  );
}
