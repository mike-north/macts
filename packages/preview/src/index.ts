/**
 * Preview HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { PreviewClient } from '@macts/sdk-preview';
 *
 * const client = new PreviewClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { PreviewClient, PreviewError, HttpClient } from './client.js'
export type { PreviewClientOptions } from './client.js'
export * from './types.js'
export { DocumentResourceClient } from './resources/document.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
