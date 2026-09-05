import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

/**
 * Minimal async data hook: calls `fn` whenever `deps` change, tracks
 * loading/error/data, and ignores stale results if the component
 * unmounts (or deps change again) before the call resolves.
 *
 * This is a deliberately small stand-in for a real data-fetching library.
 * Pages only ever call `<feature>Api.ts` functions through this hook, so
 * if mutation-driven refetching (via `refetch`) starts feeling unwieldy
 * once real endpoints exist, swap this hook's implementation for
 * TanStack Query — call sites and the api functions underneath don't
 * need to change.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: null });
  const [version, setVersion] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fnRef.current().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ data: undefined, loading: false, error: error instanceof Error ? error : new Error(String(error)) });
        }
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, refetch };
}
