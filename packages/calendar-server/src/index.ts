/**
 * The Calendar server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `calendarContract` from `@macts/calendar/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { calendarContract as contract } from '@macts/calendar/contract'
