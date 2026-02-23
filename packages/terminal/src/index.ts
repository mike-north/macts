/**
 * Terminal HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { TerminalClient } from '@macts/sdk-terminal';
 *
 * const client = new TerminalClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { TerminalClient, TerminalError, HttpClient } from './client.js';
export type { TerminalClientOptions } from './client.js';
export * from './types.js';
export { WindowResourceClient } from './resources/window.js';
export { TabResourceClient } from './resources/tab.js';
export { SettingsSetResourceClient } from './resources/settingsset.js';
