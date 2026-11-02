/**
 * The Finder server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `finderContract` from `@macts/finder/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { finderContract as contract } from '@macts/finder/contract'
