/**
 * The System Settings server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `systemSettingsContract` from `@macts/system-settings/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { systemSettingsContract as contract } from '@macts/system-settings/contract'
