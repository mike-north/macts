/**
 * The Preview server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `previewContract` from `@macts/preview/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { previewContract as contract } from '@macts/preview/contract'
