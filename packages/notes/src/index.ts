/**
 * Notes HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { NotesClient } from '@macts/sdk-notes';
 *
 * const client = new NotesClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { NotesClient, NotesError, HttpClient } from './client.js'
export type { NotesClientOptions } from './client.js'
export * from './types.js'
export { AccountResourceClient } from './resources/account.js'
export { FolderResourceClient } from './resources/folder.js'
export { NoteResourceClient } from './resources/note.js'
export { AttachmentResourceClient } from './resources/attachment.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
