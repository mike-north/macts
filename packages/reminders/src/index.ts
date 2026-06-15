/**
 * Reminders HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { RemindersClient } from '@macts/sdk-reminders';
 *
 * const client = new RemindersClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { RemindersClient, RemindersError, HttpClient } from './client.js'
export type { RemindersClientOptions } from './client.js'
export * from './types.js'
export { AccountResourceClient } from './resources/account.js'
export { ListResourceClient } from './resources/list.js'
export { ReminderResourceClient } from './resources/reminder.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
