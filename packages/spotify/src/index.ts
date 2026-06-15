/**
 * Spotify HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { SpotifyClient } from '@macts/sdk-spotify';
 *
 * const client = new SpotifyClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { SpotifyClient, SpotifyError, HttpClient } from './client.js'
export type { SpotifyClientOptions } from './client.js'
export * from './types.js'
