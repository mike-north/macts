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
export { ArtworkResourceClient } from './resources/artwork.js'
export { BrowserWindowResourceClient } from './resources/browserwindow.js'
export { FileTrackResourceClient } from './resources/filetrack.js'
export { LibraryPlaylistResourceClient } from './resources/libraryplaylist.js'
export { PlaylistResourceClient } from './resources/playlist.js'
export { PlaylistWindowResourceClient } from './resources/playlistwindow.js'
export { SharedTrackResourceClient } from './resources/sharedtrack.js'
export { SourceResourceClient } from './resources/source.js'
export { TrackResourceClient } from './resources/track.js'
export { URLTrackResourceClient } from './resources/urltrack.js'
export { UserPlaylistResourceClient } from './resources/userplaylist.js'
export { VideoWindowResourceClient } from './resources/videowindow.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
