/**
 * `@macts/sdk/local` — run macts operations on this Mac, in process.
 *
 * `createClient(app, { token })` takes the same generated app contract as the
 * remote `createClient` from `@macts/sdk` and returns the same client. Every
 * call is verified, permission-checked, governed, and validated by the Mac-side
 * runtime exactly as the macts service would; there is no shortcut for local
 * callers.
 *
 * Like `@macts/sdk`, this entry point re-exports every public symbol of
 * `@macts/contracts` (error classes, value types, and their helpers). Both
 * entry points export the same bindings, so `instanceof` checks and branded
 * values work across them.
 * Switching locality means changing the import specifier and the options
 * object; `catch` blocks and values stay the same.
 *
 * It loads the Mac-side runtime and native execution, so it is meant to run
 * on the Mac whose apps it automates. Code that runs elsewhere imports
 * `@macts/sdk` instead.
 *
 * @packageDocumentation
 */

export * from '@macts/contracts'
export { createClient, type LocalClientOptions } from './local-client.js'
