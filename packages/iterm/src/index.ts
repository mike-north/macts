/**
 * iTerm HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { iTermClient } from '@macts/sdk-iterm';
 *
 * const client = new iTermClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { iTermClient, iTermError, HttpClient } from './client.js'
export type { iTermClientOptions } from './client.js'
export * from './types.js'
