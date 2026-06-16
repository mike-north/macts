/**
 * Microsoft Word HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { MicrosoftWordClient } from '@macts/sdk-microsoft word';
 *
 * const client = new MicrosoftWordClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { MicrosoftWordClient, MicrosoftWordError, HttpClient } from './client.js'
export type { MicrosoftWordClientOptions } from './client.js'
export * from './types.js'
export { DocumentResourceClient } from './resources/document.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
