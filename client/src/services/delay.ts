/**
 * Simulates network latency for mock API calls. Every `<feature>Api.ts`
 * function awaits this before touching its mock array, so call sites
 * already behave like they're talking to a real, asynchronous backend.
 * Delete this once real `fetch` calls provide their own latency.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
