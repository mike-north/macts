/**
 * QuickTime Player HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { QuickTimePlayerClient } from '@macts/sdk-quicktime player';
 *
 * const client = new QuickTimePlayerClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { QuickTimePlayerClient, QuickTimePlayerError, HttpClient } from './client.js'
export type { QuickTimePlayerClientOptions } from './client.js'
export * from './types.js'
export { DocumentResourceClient } from './resources/document.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
