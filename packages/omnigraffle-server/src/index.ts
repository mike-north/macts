/**
 * The OmniGraffle server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `omniGraffleContract` from `@macts/omnigraffle/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { omniGraffleContract as contract } from '@macts/omnigraffle/contract'
