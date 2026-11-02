/**
 * The OmniFocus server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `omniFocusContract` from `@macts/omnifocus/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { omniFocusContract as contract } from '@macts/omnifocus/contract'
