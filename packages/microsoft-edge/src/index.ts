/**
 * Microsoft Edge HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { MicrosoftEdgeClient } from '@macts/sdk-microsoft edge';
 *
 * const client = new MicrosoftEdgeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { MicrosoftEdgeClient, MicrosoftEdgeError, HttpClient } from './client.js'
export type { MicrosoftEdgeClientOptions } from './client.js'
export * from './types.js'
export { WindowResourceClient } from './resources/window.js'
export { TabResourceClient } from './resources/tab.js'
export { BookmarkFolderResourceClient } from './resources/bookmarkfolder.js'
export { BookmarkItemResourceClient } from './resources/bookmarkitem.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
