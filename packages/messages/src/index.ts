/**
 * Messages HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { MessagesClient } from '@macts/sdk-messages';
 *
 * const client = new MessagesClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { MessagesClient, MessagesError, HttpClient } from './client.js'
export type { MessagesClientOptions } from './client.js'
export * from './types.js'
export { ParticipantResourceClient } from './resources/participant.js'
export { AccountResourceClient } from './resources/account.js'
export { ChatResourceClient } from './resources/chat.js'
