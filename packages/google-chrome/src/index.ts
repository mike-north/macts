/**
 * Google Chrome HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { GoogleChromeClient } from '@macts/sdk-google chrome';
 *
 * const client = new GoogleChromeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { GoogleChromeClient, GoogleChromeError, HttpClient } from './client.js';
export type { GoogleChromeClientOptions } from './client.js';
export * from './types.js';
export { WindowResourceClient } from './resources/window.js';
export { TabResourceClient } from './resources/tab.js';
export { BookmarkFolderResourceClient } from './resources/bookmarkfolder.js';
export { BookmarkItemResourceClient } from './resources/bookmarkitem.js';
