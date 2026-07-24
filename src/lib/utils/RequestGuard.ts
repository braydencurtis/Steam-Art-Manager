// Never cleaned up - bounded by the distinct request keys used this session
// (in practice, games x grid types), and each key's entry is overwritten
// rather than appended to, so this stays small for the app's lifetime.
const latestTokens = new Map<string, number>();

/**
 * Registers a new in-flight request for `key`, invalidating any previously
 * registered request for the same key. Call this synchronously before
 * starting any async work.
 * @param key The request's identity - concurrent requests for the same key contend, different keys never do.
 * @returns A token to pass to isLatestRequest() once the async work completes.
 */
export function beginRequest(key: string): number {
  const token = (latestTokens.get(key) ?? 0) + 1;
  latestTokens.set(key, token);
  return token;
}

/**
 * Checks whether `token` is still the most recently issued token for `key`.
 * Call this immediately before performing a store write that resulted from
 * the async work started under `token` - if a newer request has since begun
 * for the same key, this call's result is stale and its write should be
 * skipped, since it no longer reflects what the newer request already did
 * or is about to do.
 * @param key The request's identity, as passed to beginRequest().
 * @param token The token returned by the beginRequest() call this is checking.
 * @returns Whether the write should proceed.
 */
export function isLatestRequest(key: string, token: number): boolean {
  return latestTokens.get(key) === token;
}
