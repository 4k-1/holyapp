import type { MassIntentionRequest } from "@/types";

interface IntentionCardProps {
  intention: MassIntentionRequest;
}

export function IntentionCard({ intention }: IntentionCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          🕯
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-serif text-lg font-bold text-ink">{intention.intentionType}</p>
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#dbe6ee] px-3 py-1.5 text-[12px] font-bold text-[#33607e]">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {intention.status === "said" ? "Said" : intention.status === "confirmed" ? "Scheduled" : "Requested"}
            </span>
          </div>

          <p className="mt-1 text-sm text-ink">
            For <span className="font-semibold">{intention.intentionFor}</span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <span>
              {new Date(intention.scheduleDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-border">·</span>
            <span>{intention.scheduleTime}</span>
            <span className="text-border">·</span>
            <span>{intention.scheduleLabel} schedule</span>
          </div>

          <p className="mt-2 text-xs text-ink-muted">
            Requested by {intention.requestedBy} ·{" "}
            {new Date(intention.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>

          {intention.payment !== "none" && (
            <p className="mt-1 text-xs text-ink-muted">
              {intention.payment === "paid" ? "Donated" : "Donation pending"}{" "}
              <span className="font-semibold text-ink">₱{intention.offering.toLocaleString("en-PH")}</span> through GCash
            </p>
          )}
        </div>
      </div>
    </div>
  );
}