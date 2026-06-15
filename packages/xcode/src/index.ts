/**
 * Xcode HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { XcodeClient } from '@macts/sdk-xcode';
 *
 * const client = new XcodeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { XcodeClient, XcodeError, HttpClient } from './client.js'
export type { XcodeClientOptions } from './client.js'
export * from './types.js'
export { WorkspaceDocumentResourceClient } from './resources/workspacedocument.js'
export { ProjectResourceClient } from './resources/project.js'
export { SchemeResourceClient } from './resources/scheme.js'
export { RunDestinationResourceClient } from './resources/rundestination.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
