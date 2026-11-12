import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * True when the page was opened with ?new=<form>, e.g. from a dashboard quick action, so the page can
 * open that form straight away. The ?new is then taken off the address, so a refresh or Back doesn't
 * open the form again.
 */
export function useOpenFromLink(form: string) {
  const [params, setParams] = useSearchParams();
  const [open] = useState(() => params.get("new") === form);
  useEffect(() => {
    if (!params.has("new")) return;
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
  }, [params, setParams]);
  return open;
}
