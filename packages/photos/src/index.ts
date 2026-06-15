/**
 * Photos HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { PhotosClient } from '@macts/sdk-photos';
 *
 * const client = new PhotosClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { PhotosClient, PhotosError, HttpClient } from './client.js'
export type { PhotosClientOptions } from './client.js'
export * from './types.js'
export { MediaItemResourceClient } from './resources/mediaitem.js'
export { ContainerResourceClient } from './resources/container.js'
export { AlbumResourceClient } from './resources/album.js'
export { FolderResourceClient } from './resources/folder.js'
export { MomentResourceClient } from './resources/moment.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
