/**
 * The Automator server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `automatorContract` from `@macts/automator/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { automatorContract as contract } from '@macts/automator/contract'
