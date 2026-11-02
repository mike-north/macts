/**
 * The Messages server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `messagesContract` from `@macts/messages/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { messagesContract as contract } from '@macts/messages/contract'
