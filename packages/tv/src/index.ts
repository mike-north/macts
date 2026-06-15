/**
 * TV HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { TVClient } from '@macts/sdk-tv';
 *
 * const client = new TVClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { TVClient, TVError, HttpClient } from './client.js'
export type { TVClientOptions } from './client.js'
export * from './types.js'
export { FileTrackResourceClient } from './resources/filetrack.js'
export { PlaylistResourceClient } from './resources/playlist.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
