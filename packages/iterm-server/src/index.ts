/**
 * The iTerm server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `iTermContract` from `@macts/iterm/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { iTermContract as contract } from '@macts/iterm/contract'
