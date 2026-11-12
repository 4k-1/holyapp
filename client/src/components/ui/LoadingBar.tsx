import { useEffect, useState } from "react";
import { API_ACTIVITY_EVENT } from "@/lib/api";

/*
 * A thin bar across the top of the screen while a page's data is still on its way.
 * It waits a moment before showing, so quick loads don't make it flicker.
 */

const SHOW_AFTER_MS = 150;

export function LoadingBar() {
  const [requests, setRequests] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onActivity = (event: Event) => setRequests((event as CustomEvent<number>).detail);
    window.addEventListener(API_ACTIVITY_EVENT, onActivity);
    return () => window.removeEventListener(API_ACTIVITY_EVENT, onActivity);
  }, []);

  const busy = requests > 0;
  useEffect(() => {
    if (!busy) {
      const timer = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  if (!visible) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden bg-[#cfeaea]/70 print:hidden"
    >
      <div className="loading-bar h-full w-1/3 rounded-full bg-[#16798c]" />
    </div>
  );
}
