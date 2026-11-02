/**
 * The Arc server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `arcContract` from `@macts/arc/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { arcContract as contract } from '@macts/arc/contract'
