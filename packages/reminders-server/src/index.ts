/**
 * The Reminders server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `remindersContract` from `@macts/reminders/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { remindersContract as contract } from '@macts/reminders/contract'
