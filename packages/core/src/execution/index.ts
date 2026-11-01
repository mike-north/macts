/**
 * The provider-neutral execution seam.
 *
 * This entry point stays provider-neutral: it declares what an executor is and
 * what it receives, and it must not import a provider. Provider
 * implementations, such as the native macOS automation provider in `src/jxa/`,
 * depend on this module, never the reverse.
 *
 * @packageDocumentation
 */

export type { Executor, ExecutionRequest } from './executor.js'
