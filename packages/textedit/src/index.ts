/**
 * TextEdit HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { TextEditClient } from '@macts/sdk-textedit';
 *
 * const client = new TextEditClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { TextEditClient, TextEditError, HttpClient } from './client.js'
export type { TextEditClientOptions } from './client.js'
export * from './types.js'
export { DocumentResourceClient } from './resources/document.js'
