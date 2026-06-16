/**
 * OmniFocus HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { OmniFocusClient } from '@macts/sdk-omnifocus';
 *
 * const client = new OmniFocusClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { OmniFocusClient, OmniFocusError, HttpClient } from './client.js'
export type { OmniFocusClientOptions } from './client.js'
export * from './types.js'
export { TaskResourceClient } from './resources/task.js'
export { ProjectResourceClient } from './resources/project.js'
export { FolderResourceClient } from './resources/folder.js'
export { TagResourceClient } from './resources/tag.js'
export { InboxTaskResourceClient } from './resources/inboxtask.js'
export { PerspectiveResourceClient } from './resources/perspective.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
