/**
 * The OmniPlan server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `omniPlanContract` from `@macts/omniplan/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { omniPlanContract as contract } from '@macts/omniplan/contract'
