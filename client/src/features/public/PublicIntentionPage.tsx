import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ensureParishes, getParishBySlug } from "@/features/parish/parishApi";
import { IntentionForm } from "@/features/parishioner/intentions/IntentionForm";
import type { Parish } from "@/types";

export function PublicIntentionPage() {
  const { parishSlug } = useParams();
  const [parish, setParish] = useState<Parish | undefined>(() =>
    parishSlug ? getParishBySlug(parishSlug) : undefined
  );
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!parishSlug) return;
    void ensureParishes().then(() => setParish(getParishBySlug(parishSlug)));
  }, [parishSlug]);

  if (!parish) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-sm text-ink-muted">Parish not found. Check the link and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt px-4 py-10 sm:px-6 ">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          {parish.sealUrl ? (
            <img
              src={parish.sealUrl}
              alt={`${parish.name} seal`}
              className="mb-3 h-16 w-16 rounded-full border border-border object-contain shadow-sm bg-white"
            />
          ) : (
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-serif text-2xl font-bold text-primary shadow-sm">
              {parish.name.charAt(0)}
            </div>
          )}
          <p className="font-serif text-xl font-bold leading-snug text-ink sm:text-2xl">{parish.name}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Request a Mass Intention
          </p>
        </div>

        <p className="mb-6 text-center text-sm leading-relaxed text-ink-muted">
          Offer a Mass for a special intention — thanksgiving, healing, or in memory of a loved one.
        </p>

        {submitted ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
              ✓
            </div>
            <h2 className="font-serif text-xl font-bold text-ink">Intention submitted</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              The parish office has received your request. Staff will confirm it against the Mass schedule —
              this is not a confirmed booking yet.
            </p>
          </div>
        ) : (
          <IntentionForm parish={parish} requesterId={null} onSubmitted={() => setSubmitted(true)} />
        )}
      </div>
    </div>
  );
}