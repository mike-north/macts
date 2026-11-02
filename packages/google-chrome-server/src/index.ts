/**
 * The Google Chrome server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `googleChromeContract` from `@macts/google-chrome/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { googleChromeContract as contract } from '@macts/google-chrome/contract'
