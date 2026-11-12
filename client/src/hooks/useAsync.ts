import { useCallback, useEffect, useEffectEvent, useState } from "react";

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

function sameKey(a: unknown[], b: unknown[]) {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
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
  const key = [...deps, version];

  // When the inputs change, flip to loading during this render rather than after the effect runs.
  const [prevKey, setPrevKey] = useState(key);
  if (!sameKey(prevKey, key)) {
    setPrevKey(key);
    setState((prev) => ({ ...prev, loading: true, error: null }));
  }

  const run = useEffectEvent(() => fn());

  useEffect(() => {
    let cancelled = false;

    run().then(
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
  }, key);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, refetch };
}
