import { useEffect, useEffectEvent } from "react";

/**
 * Calls `refresh` every `ms` while the page is in view, and straight away when the person comes
 * back to the tab or window. For office pages whose data other people change (e.g. a parishioner
 * paying with GCash), so staff see it without reloading.
 */
export function useAutoRefresh(refresh: () => void, ms: number) {
  const tick = useEffectEvent(() => refresh());

  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const timer = window.setInterval(() => {
      if (visible()) tick();
    }, ms);
    const onReturn = () => {
      if (visible()) tick();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [ms]);
}
