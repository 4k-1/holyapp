import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CandleIcon, DoveIcon, DropletIcon, HeartIcon } from "@/components/ui/icons/SacramentIcons";
import { listMyTimeline, type TimelineEvent } from "@/features/parishioner/timeline/api/timelineApi";
import type { SacramentType } from "@/types";

const ICONS: Record<SacramentType, typeof DropletIcon> = {
  baptism: DropletIcon,
  confirmation: DoveIcon,
  marriage: HeartIcon,
  death: CandleIcon,
};

function formatDate(value: string | null) {
  if (!value) return "Date not recorded";
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function SacramentalTimelinePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listMyTimeline()
      .then(setEvents)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load timeline.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        ← Back
      </button>

      <h1 className="font-serif text-2xl font-bold text-ink">Sacramental timeline</h1>
      <p className="mt-1.5 mb-6 text-sm text-ink-muted">
        Entries the parish has on file that match your name. This is not a certificate.
      </p>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!loading && !error && events.length === 0 && (
        <p className="rounded-2xl border border-border bg-surface px-4 py-5 text-sm text-ink-muted shadow-sm">
          No register entries match your name yet. If you were baptized or confirmed in this parish, the office can
          annotate the book and it will show up here.
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {events.map((event) => {
          const Icon = ICONS[event.sacramentType];
          return (
            <li key={`${event.sacramentType}-${event.id}`} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{event.title}</p>
                  <p className="text-sm text-ink-muted">{formatDate(event.date)}</p>
                  {event.place && <p className="mt-1 text-sm text-ink">{event.place}</p>}
                  {event.parishName && <p className="text-xs text-ink-muted">{event.parishName}</p>}
                  {(event.bookNumber || event.pageNumber || event.entryNumber) && (
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      Book {event.bookNumber ?? "—"}, page {event.pageNumber ?? "—"}, line {event.entryNumber ?? "—"}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
