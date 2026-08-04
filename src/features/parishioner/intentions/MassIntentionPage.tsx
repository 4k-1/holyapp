import { useNavigate, useOutletContext } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { IntentionForm } from "@/features/parishioner/intentions/IntentionForm";
import type { Parish } from "@/types";

export function MassIntentionPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <button type="button" onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        ← Back to Dashboard
      </button>
      <h1 className="font-serif text-[26px] font-bold text-ink">Request a Mass Intention</h1>
      <p className="mb-6 mt-1 text-sm leading-relaxed text-ink-muted">
        Offer a Mass for a special intention — thanksgiving, healing, or in memory of a loved one.
      </p>
      <IntentionForm
        parish={parish}
        requesterId={currentUser?.id ?? null}
        defaultRequestedBy={currentUser?.fullName ?? ""}
        onSubmitted={() => navigate(`/${parish.slug}/portal/intentions`)}
      />
    </div>
  );
}