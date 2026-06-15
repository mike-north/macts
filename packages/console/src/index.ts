/**
 * Console HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { ConsoleClient } from '@macts/sdk-console';
 *
 * const client = new ConsoleClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { ConsoleClient, ConsoleError, HttpClient } from './client.js'
export type { ConsoleClientOptions } from './client.js'
export * from './types.js'

export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
