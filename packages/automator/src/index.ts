/**
 * Automator HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { AutomatorClient } from '@macts/sdk-automator';
 *
 * const client = new AutomatorClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { AutomatorClient, AutomatorError, HttpClient } from './client.js'
export type { AutomatorClientOptions } from './client.js'
export * from './types.js'
export { WorkflowResourceClient } from './resources/workflow.js'
export { AutomatorActionResourceClient } from './resources/automatoraction.js'
export { VariableResourceClient } from './resources/variable.js'
export { SettingResourceClient } from './resources/setting.js'
export { RequiredResourceResourceClient } from './resources/requiredresource.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
