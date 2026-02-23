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

export { ContactsClient, ContactsError, HttpClient } from './client.js';
export type { ContactsClientOptions } from './client.js';
export * from './types.js';
export { AddressResourceClient } from './resources/address.js';
export { AIMHandleResourceClient } from './resources/aimhandle.js';
export { CustomDateResourceClient } from './resources/customdate.js';
export { EmailResourceClient } from './resources/email.js';
export { GroupResourceClient } from './resources/group.js';
export { ICQHandleResourceClient } from './resources/icqhandle.js';
export { InstantMessageResourceClient } from './resources/instantmessage.js';
export { JabberHandleResourceClient } from './resources/jabberhandle.js';
export { MSNHandleResourceClient } from './resources/msnhandle.js';
export { PersonResourceClient } from './resources/person.js';
export { PhoneResourceClient } from './resources/phone.js';
export { RelatedNameResourceClient } from './resources/relatedname.js';
export { SocialProfileResourceClient } from './resources/socialprofile.js';
export { UrlResourceClient } from './resources/url.js';
export { YahooHandleResourceClient } from './resources/yahoohandle.js';
