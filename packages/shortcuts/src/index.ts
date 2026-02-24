/**
 * Shortcuts HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { ShortcutsClient } from '@macts/sdk-shortcuts';
 *
 * const client = new ShortcutsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { ShortcutsClient, ShortcutsError, HttpClient } from './client.js'
export type { ShortcutsClientOptions } from './client.js'
export * from './types.js'
export { ShortcutResourceClient } from './resources/shortcut.js'
export { FolderResourceClient } from './resources/folder.js'
