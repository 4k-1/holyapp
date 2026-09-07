import type { CertificateRequest } from "@/types";
import { getTrackerState } from "@/features/parishioner/requests/trackerState";

interface RequestStepTrackerProps {
  request: CertificateRequest;
}

export function RequestStepTracker({ request }: RequestStepTrackerProps) {
  const { steps, doneCount, currentIndex, rejected, fillPercent } = getTrackerState(request);

  return (
    <div className="relative mt-4 flex w-full pt-1">
      <div className="absolute left-[9px] right-[9px] top-[10px] h-0 border-t-2 border-dashed border-border sm:left-[11px] sm:right-[11px] sm:top-[14px]" />
      <div
        className={`absolute left-[9px] top-[10px] h-0 border-t-2 transition-all duration-300 sm:left-[11px] sm:top-[14px] ${
          rejected ? "border-danger" : "border-emerald-600"
        }`}
        style={{ width: `calc(${fillPercent}% - 18px * ${fillPercent / 100})` }}
      />

      {steps.map((label, i) => {
        const isDone = i < doneCount;
        const isCurrent = i === currentIndex;
        const isRejectedNode = rejected && i === steps.length - 1;

        return (
          <div key={label} className="relative z-10 flex flex-1 flex-col items-center gap-1 sm:gap-1.5">
            <div
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 text-[8.5px] sm:h-[22px] sm:w-[22px] sm:text-[10px] ${
                isRejectedNode
                  ? "border-danger bg-danger text-white"
                  : isDone
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : isCurrent
                  ? "border-emerald-600 bg-white"
                  : "border-dashed border-border bg-white"
              }`}
            >
              {isRejectedNode ? (
                "✕"
              ) : isDone ? (
                "✓"
              ) : isCurrent ? (
                <span className="h-[6px] w-[6px] rounded-full bg-emerald-600 sm:h-[8px] sm:w-[8px]" />
              ) : null}
            </div>
            <span
              className={`px-0.5 text-center text-[8.5px] leading-tight sm:text-[10.5px] ${
                isRejectedNode
                  ? "font-bold text-danger"
                  : isCurrent
                  ? "font-bold text-emerald-700"
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