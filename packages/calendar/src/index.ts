/**
 * Calendar HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { CalendarClient } from '@macts/sdk-calendar';
 *
 * const client = new CalendarClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { CalendarClient, CalendarError, HttpClient } from './client.js'
export type { CalendarClientOptions } from './client.js'
export * from './types.js'
export { CalendarResourceClient } from './resources/calendar.js'
export { EventResourceClient } from './resources/event.js'
export { AttendeeResourceClient } from './resources/attendee.js'
export { DisplayAlarmResourceClient } from './resources/displayalarm.js'
export { MailAlarmResourceClient } from './resources/mailalarm.js'
export { SoundAlarmResourceClient } from './resources/soundalarm.js'
export { OpenFileAlarmResourceClient } from './resources/openfilealarm.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
