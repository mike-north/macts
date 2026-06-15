/**
 * Alfred HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { AlfredClient } from '@macts/sdk-alfred';
 *
 * const client = new AlfredClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { AlfredClient, AlfredError, HttpClient } from './client.js'
export type { AlfredClientOptions } from './client.js'
export * from './types.js'
