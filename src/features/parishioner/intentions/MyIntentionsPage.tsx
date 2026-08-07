import { Link, useOutletContext } from "react-router-dom";
import { listMassIntentions } from "@/features/parishioner/intentions/intentionsApi";
import { useAsync } from "@/hooks/useAsync";
import { IntentionCard } from "@/features/parishioner/intentions/components/IntentionCard";
import type { Parish } from "@/types";

export function MyIntentionsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { data: intentions = [], loading } = useAsync(() => listMassIntentions(parish.id), [parish.id]);

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

      {loading ? (
        <p className="text-sm text-ink-muted">Loading your intentions…</p>
      ) : intentions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-ink-muted">
          You haven't requested any Mass intentions yet.
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