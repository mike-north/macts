/**
 * The TV server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `tvContract` from `@macts/tv/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { tvContract as contract } from '@macts/tv/contract'
