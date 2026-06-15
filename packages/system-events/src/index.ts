/**
 * System Events HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { SystemEventsClient } from '@macts/sdk-system events';
 *
 * const client = new SystemEventsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { SystemEventsClient, SystemEventsError, HttpClient } from './client.js'
export type { SystemEventsClientOptions } from './client.js'
export * from './types.js'
export { DiskItemResourceClient } from './resources/diskitem.js'
export { ActionResourceClient } from './resources/action.js'
export { UIElementResourceClient } from './resources/uielement.js'
