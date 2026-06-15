/**
 * OmniPlan HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { OmniPlanClient } from '@macts/sdk-omniplan';
 *
 * const client = new OmniPlanClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { OmniPlanClient, OmniPlanError, HttpClient } from './client.js'
export type { OmniPlanClientOptions } from './client.js'
export * from './types.js'
export { ProjectResourceClient } from './resources/project.js'
export { TaskResourceClient } from './resources/task.js'
export { MilestoneResourceClient } from './resources/milestone.js'
export { ResourceResourceClient } from './resources/resource.js'
export { AssignmentResourceClient } from './resources/assignment.js'
export { DependencyResourceClient } from './resources/dependency.js'
export { ViolationResourceClient } from './resources/violation.js'
export { ScenarioResourceClient } from './resources/scenario.js'
export { ScheduleResourceClient } from './resources/schedule.js'
export { CurrencyResourceClient } from './resources/currency.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
