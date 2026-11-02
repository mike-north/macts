/**
 * The Alfred server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `alfredContract` from `@macts/alfred/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { alfredContract as contract } from '@macts/alfred/contract'
