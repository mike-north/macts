/**
 * The Photos server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `photosContract` from `@macts/photos/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { photosContract as contract } from '@macts/photos/contract'
