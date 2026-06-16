/**
 * Screen Sharing HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { ScreenSharingClient } from '@macts/sdk-screen sharing';
 *
 * const client = new ScreenSharingClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { ScreenSharingClient, ScreenSharingError, HttpClient } from './client.js'
export type { ScreenSharingClientOptions } from './client.js'
export * from './types.js'
export { ConnectionResourceClient } from './resources/connection.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
