/**
 * The QuickTime Player server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `quickTimePlayerContract` from `@macts/quicktime-player/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { quickTimePlayerContract as contract } from '@macts/quicktime-player/contract'
