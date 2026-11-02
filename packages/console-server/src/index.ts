/**
 * The Console server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `consoleContract` from `@macts/console/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { consoleContract as contract } from '@macts/console/contract'
