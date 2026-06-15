/**
 * Mail HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { MailClient } from '@macts/sdk-mail';
 *
 * const client = new MailClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { MailClient, MailError, HttpClient } from './client.js'
export type { MailClientOptions } from './client.js'
export * from './types.js'
export { OutgoingMessageResourceClient } from './resources/outgoingmessage.js'
export { MessageResourceClient } from './resources/message.js'
