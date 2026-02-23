/**
 * System Settings HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { SystemSettingsClient } from '@macts/sdk-system settings';
 *
 * const client = new SystemSettingsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { SystemSettingsClient, SystemSettingsError, HttpClient } from './client.js';
export type { SystemSettingsClientOptions } from './client.js';
export * from './types.js';
export { PaneResourceClient } from './resources/pane.js';
export { AnchorResourceClient } from './resources/anchor.js';
