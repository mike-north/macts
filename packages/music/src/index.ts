/**
 * Music HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { MusicClient } from '@macts/sdk-music';
 *
 * const client = new MusicClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { MusicClient, MusicError, HttpClient } from './client.js'
export type { MusicClientOptions } from './client.js'
export * from './types.js'
export { FileTrackResourceClient } from './resources/filetrack.js'
export { PlaylistResourceClient } from './resources/playlist.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
