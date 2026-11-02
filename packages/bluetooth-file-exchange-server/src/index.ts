/**
 * The Bluetooth File Exchange server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `bluetoothFileExchangeContract` from `@macts/bluetooth-file-exchange/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { bluetoothFileExchangeContract as contract } from '@macts/bluetooth-file-exchange/contract'
