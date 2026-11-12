import { useEffect, useState } from "react";

/**
 * Holds what is being printed. Starting a job renders its sheet, opens the browser's print dialog, and clears
 * the job once printing is done or cancelled.
 */
export function usePrintJob<T>() {
  const [job, setJob] = useState<T | null>(null);

  useEffect(() => {
    if (job === null) return;
    const done = () => setJob(null);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    return () => window.removeEventListener("afterprint", done);
  }, [job]);

  return [job, setJob] as const;
}
