/**
 * `@macts/sdk` — typed, governed clients for macOS apps automated by macts.
 *
 * Application code imports everything it needs from here: the client factory,
 * the canonical structured errors, and the value types (such as `Integer`,
 * references, and file values). App packages supply the contract a client is
 * created from; they expose it at the `/contract` subpath.
 *
 * ## Remote and local
 *
 * `createClient` from this entry point runs operations on a macts service
 * over HTTP. It never loads the Mac-side runtime or native execution, so it
 * works anywhere Node runs. `createClient` from `@macts/sdk/local` takes the
 * same contract and runs operations in process on this Mac. Both return the
 * same client and throw the same error classes; switching locality changes
 * only the import specifier and the options object.
 *
 * ```typescript
 * import { createClient, resolveClientOptions, PolicyDeniedError } from '@macts/sdk'
 * import { calendarContract } from '@macts/calendar/contract'
 *
 * const calendar = createClient(calendarContract, resolveClientOptions())
 * try {
 *   const calendars = await calendar.calendars.list()
 * } catch (error) {
 *   if (error instanceof PolicyDeniedError) console.error('Blocked by policy')
 *   else throw error
 * }
 * ```
 *
 * ## References
 *
 * A reference in a result is bound to the client that decoded it, and its
 * `resolve()` hydrates it through that client. `bindReference(client, data)`
 * binds a reference the caller built (an identifier or a selector), or one
 * bound to another client of the same app, to `client` in the same way,
 * without making a call. Both entry points export it, and it accepts clients
 * from either. A client's type carries its contract's resource table, so
 * `bindReference` admits only references the contract can resolve, and types
 * the result with the resource's record.
 *
 * ## Environment variables
 *
 * | Variable | Required | Description |
 * |---|---|---|
 * | `MACTS_API_KEY` | Yes | API key token (`macts_sk_...`). Create with `macts api-key create`. |
 * | `MACTS_API_URL` | No | Root URL of the macts service. Default: `http://localhost:8372`. |
 *
 * ## Governance and errors
 *
 * Every call is verified, permission-checked, and governed by macts before it
 * runs, whichever entry point created the client. Failures are thrown as the
 * canonical classes re-exported here (`PermissionDeniedError`,
 * `PolicyDeniedError`, `TargetNotFoundError`, and the rest), all extending
 * `MactsError`, so `instanceof` and `switch (error.code)` work the same in
 * both localities.
 *
 * @packageDocumentation
 */

export * from '@macts/contracts'
export { createClient, type RemoteClientOptions } from './remote.js'
export { bindReference } from './codec-runtime.js'
export { resolveApiKey, resolveBaseUrl, resolveClientOptions, DEFAULT_BASE_URL } from './resolve.js'
