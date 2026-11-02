/**
 * The System Events server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `systemEventsContract` from `@macts/system-events/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { systemEventsContract as contract } from '@macts/system-events/contract'
