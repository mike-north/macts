/**
 * Finder HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { FinderClient } from '@macts/sdk-finder';
 *
 * const client = new FinderClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { FinderClient, FinderError, HttpClient } from './client.js'
export type { FinderClientOptions } from './client.js'
export * from './types.js'

export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
