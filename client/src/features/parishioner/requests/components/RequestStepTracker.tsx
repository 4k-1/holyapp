import type { CertificateRequest } from "@/types";
import { getTrackerState } from "@/features/parishioner/requests/trackerState";

/** The request's steps in a line: done ones ticked, the current one ringed, a refusal in red. */
export function RequestStepTracker({ request }: { request: CertificateRequest }) {
  const { steps, doneCount, currentIndex, rejected } = getTrackerState(request);

  return (
    <ol className="flex w-full" aria-label="Request progress" data-tracker>
      {steps.map((label, i) => {
        const isRejectedNode = rejected && i === steps.length - 1;
        const isDone = !isRejectedNode && i < doneCount;
        const isCurrent = !isRejectedNode && !isDone && i === currentIndex;

        return (
          <li
            key={label}
            className="relative flex flex-1 flex-col items-center"
            aria-current={isCurrent ? "step" : undefined}
          >
            {i > 0 && (
              <span
                className={`absolute right-1/2 top-[11px] h-0.5 w-full ${
                  isRejectedNode ? "bg-danger/50" : isDone || isCurrent ? "bg-primary" : "bg-border"
                }`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                isRejectedNode
                  ? "border-danger bg-danger text-white"
                  : isDone
                    ? "border-primary bg-primary text-white"
                    : isCurrent
                      ? "border-primary bg-surface"
                      : "border-border bg-surface"
              }`}
              aria-hidden="true"
            >
              {isRejectedNode ? (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-3 w-3">
                  <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
                </svg>
              ) : isDone ? (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-3 w-3">
                  <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : isCurrent ? (
                <span className="h-2 w-2 rounded-full bg-primary" />
              ) : null}
            </span>
            <span
              className={`mt-1.5 px-0.5 text-center text-[0.75rem] leading-tight sm:text-[0.8125rem] ${
                isRejectedNode
                  ? "font-semibold text-danger"
                  : isCurrent
                    ? "font-semibold text-primary"
                    : isDone
                      ? "text-ink"
                      : "text-ink-muted"
              }`}
            >
              {label}
              <span className="sr-only">{isDone ? " (done)" : isCurrent ? " (current step)" : isRejectedNode ? "" : " (to come)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
