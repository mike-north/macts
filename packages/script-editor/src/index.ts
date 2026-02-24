/**
 * Script Editor HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { ScriptEditorClient } from '@macts/sdk-script editor';
 *
 * const client = new ScriptEditorClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { ScriptEditorClient, ScriptEditorError, HttpClient } from './client.js';
export type { ScriptEditorClientOptions } from './client.js';
export * from './types.js';
export { DocumentResourceClient } from './resources/document.js';
