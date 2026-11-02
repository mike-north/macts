/**
 * The Xcode server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `xcodeContract` from `@macts/xcode/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { xcodeContract as contract } from '@macts/xcode/contract'
