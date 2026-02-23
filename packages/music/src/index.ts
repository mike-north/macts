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

export { MusicClient, MusicError, HttpClient } from './client.js';
export type { MusicClientOptions } from './client.js';
export * from './types.js';
export { AirPlayDeviceResourceClient } from './resources/airplaydevice.js';
export { ArtworkResourceClient } from './resources/artwork.js';
export { AudioCDPlaylistResourceClient } from './resources/audiocdplaylist.js';
export { AudioCDTrackResourceClient } from './resources/audiocdtrack.js';
export { BrowserWindowResourceClient } from './resources/browserwindow.js';
export { EncoderResourceClient } from './resources/encoder.js';
export { EQPresetResourceClient } from './resources/eqpreset.js';
export { EQWindowResourceClient } from './resources/eqwindow.js';
export { FileTrackResourceClient } from './resources/filetrack.js';
export { LibraryPlaylistResourceClient } from './resources/libraryplaylist.js';
export { MiniplayerWindowResourceClient } from './resources/miniplayerwindow.js';
export { PlaylistResourceClient } from './resources/playlist.js';
export { PlaylistWindowResourceClient } from './resources/playlistwindow.js';
export { RadioTunerPlaylistResourceClient } from './resources/radiotunerplaylist.js';
export { SharedTrackResourceClient } from './resources/sharedtrack.js';
export { SourceResourceClient } from './resources/source.js';
export { SubscriptionPlaylistResourceClient } from './resources/subscriptionplaylist.js';
export { TrackResourceClient } from './resources/track.js';
export { URLTrackResourceClient } from './resources/urltrack.js';
export { UserPlaylistResourceClient } from './resources/userplaylist.js';
export { VideoWindowResourceClient } from './resources/videowindow.js';
export { VisualResourceClient } from './resources/visual.js';
