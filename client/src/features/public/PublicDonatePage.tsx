import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getParishBySlug } from "@/features/parish/parishApi";
import { DonationForm } from "@/features/parishioner/donations/DonationForm";
import type { Parish } from "@/types";

export function PublicDonatePage() {
  const { parishSlug } = useParams();
  const [parish, setParish] = useState<Parish | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (parishSlug ? getParishBySlug(parishSlug) : Promise.resolve(null)).then((found) => {
      if (!cancelled) setParish(found ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [parishSlug]);

  if (parish === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    );
  }

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
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Support the Parish</p>
        </div>

        <DonationForm parish={parish} />
      </div>
    </div>
  );
}
