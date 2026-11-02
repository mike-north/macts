/**
 * The Microsoft Word server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `microsoftWordContract` from `@macts/microsoft-word/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { microsoftWordContract as contract } from '@macts/microsoft-word/contract'
