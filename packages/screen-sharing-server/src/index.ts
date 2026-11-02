/**
 * The Screen Sharing server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `screenSharingContract` from `@macts/screen-sharing/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { screenSharingContract as contract } from '@macts/screen-sharing/contract'
