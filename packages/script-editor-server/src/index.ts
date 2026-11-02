/**
 * The Script Editor server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `scriptEditorContract` from `@macts/script-editor/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { scriptEditorContract as contract } from '@macts/script-editor/contract'
