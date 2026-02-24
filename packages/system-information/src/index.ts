/**
 * System Information HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { SystemInformationClient } from '@macts/sdk-system information';
 *
 * const client = new SystemInformationClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { SystemInformationClient, SystemInformationError, HttpClient } from './client.js'
export type { SystemInformationClientOptions } from './client.js'
export * from './types.js'
export { DocumentResourceClient } from './resources/document.js'
