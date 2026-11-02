/**
 * The Music server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `musicContract` from `@macts/music/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { musicContract as contract } from '@macts/music/contract'
