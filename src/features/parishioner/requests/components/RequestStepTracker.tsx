import type { CertificateRequest } from "@/types";
import { getTrackerState } from "@/features/parishioner/requests/trackerState";

interface RequestStepTrackerProps {
  request: CertificateRequest;
}

export function RequestStepTracker({ request }: RequestStepTrackerProps) {
  const { steps, doneCount, currentIndex, rejected, fillPercent } = getTrackerState(request);

  return (
    <div className="relative mt-4 flex max-w-xl pt-1">
      <div className="absolute left-[11px] right-[11px] top-[15px] h-0.5 bg-border" />
      <div
        className={`absolute left-[11px] top-[15px] h-0.5 transition-all duration-300 ${
          rejected ? "bg-danger" : "bg-primary"
        }`}
        style={{ width: `calc(${fillPercent}% - 22px * ${fillPercent / 100})` }}
      />
      {steps.map((label, i) => {
        const isDone = i < doneCount;
        const isCurrent = i === currentIndex;
        const isRejectedNode = rejected && i === steps.length - 1;

        return (
          <div key={label} className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 text-[10px] ${
                isRejectedNode
                  ? "border-danger bg-danger text-white"
                  : isDone
                  ? "border-primary bg-primary text-white"
                  : isCurrent
                  ? "border-primary bg-primary/80 shadow-[0_0_0_4px_rgba(26,61,43,0.15)]"
                  : "border-border bg-surface"
              }`}
            >
              {isRejectedNode ? "✕" : isDone ? "✓" : ""}
            </div>
            <span
              className={`text-center text-[10.5px] leading-tight ${
                isRejectedNode
                  ? "font-bold text-danger"
                  : isCurrent
                  ? "font-bold text-primary"
                  : isDone
                  ? "text-ink"
                  : "text-ink-muted"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}