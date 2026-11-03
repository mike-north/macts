/**
 * Contacts HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { ContactsClient } from '@macts/sdk-contacts';
 *
 * const client = new ContactsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { ContactsClient, ContactsError, HttpClient } from './client.js'
export type { ContactsClientOptions } from './client.js'
export * from './types.js'
export { AddressResourceClient } from './resources/address.js'
export { EmailResourceClient } from './resources/email.js'
export { GroupResourceClient } from './resources/group.js'
export { PersonResourceClient } from './resources/person.js'
export { PhoneResourceClient } from './resources/phone.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
