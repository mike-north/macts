/**
 * Options shared by every asynchronous call a client exposes.
 *
 * Invoking an operation, resolving a reference, and fetching file content all
 * reach the runtime the same way, so they accept one options type. A call that
 * later needs its own option extends this type rather than redeclaring
 * cancellation.
 *
 * @packageDocumentation
 */

/** Options accepted by every client call that reaches the runtime. */
export interface CallOptions {
  /** Abort the call. */
  readonly signal?: AbortSignal
}
