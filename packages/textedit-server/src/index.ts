/**
 * The TextEdit server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `textEditContract` from `@macts/textedit/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { textEditContract as contract } from '@macts/textedit/contract'
