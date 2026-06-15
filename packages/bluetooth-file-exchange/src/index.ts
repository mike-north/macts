/**
 * Bluetooth File Exchange HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { BluetoothFileExchangeClient } from '@macts/sdk-bluetooth file exchange';
 *
 * const client = new BluetoothFileExchangeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { BluetoothFileExchangeClient, BluetoothFileExchangeError, HttpClient } from './client.js'
export type { BluetoothFileExchangeClientOptions } from './client.js'
export * from './types.js'

export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
