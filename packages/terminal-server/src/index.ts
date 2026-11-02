/**
 * The Terminal server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `terminalContract` from `@macts/terminal/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { terminalContract as contract } from '@macts/terminal/contract'
