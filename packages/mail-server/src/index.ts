/**
 * The Mail server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `mailContract` from `@macts/mail/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { mailContract as contract } from '@macts/mail/contract'
