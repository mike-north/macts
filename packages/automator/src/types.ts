/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { WarningLevel } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Workflow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { WorkflowCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { WorkflowUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AutomatorAction } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AutomatorActionCreateInput = Omit<
  import('./contract/index.js').AutomatorActionCreateInput,
  'index'
> & {
  /** The index of the action Numeric values are validated by the contract before dispatch. */
  index?: null extends import('./contract/index.js').AutomatorActionCreateInput['index']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type AutomatorActionUpdateInput = Omit<
  import('./contract/index.js').AutomatorActionUpdateInput,
  'index'
> & {
  /** The index of the action Numeric values are validated by the contract before dispatch. */
  index?: null extends import('./contract/index.js').AutomatorActionUpdateInput['index']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Variable } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { VariableCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { VariableUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Setting } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SettingCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SettingUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RequiredResource } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RequiredResourceCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RequiredResourceUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  currentAction: z.unknown(),
  executionResult: z.unknown(),
  executionErrorMessage: z.string(),
  executionErrorNumber: z.number(),
  executionId: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AutomatorActionSchema = z.object({
  name: z.string(),
  bundleId: z.string(),
  category: z.array(z.string()),
  comment: z.string(),
  enabled: z.boolean(),
  executionErrorMessage: z.string(),
  executionErrorNumber: z.number(),
  executionResult: z.unknown(),
  iconName: z.string(),
  id: z.string(),
  ignoresInput: z.boolean(),
  index: z.number(),
  inputTypes: z.array(z.string()),
  keywords: z.array(z.string()),
  outputTypes: z.array(z.string()),
  parentWorkflow: z.unknown(),
  path: z.string(),
  showActionWhenRun: z.boolean(),
  targetApplication: z.array(z.string()),
  version: z.string(),
  warningAction: z.string(),
  warningLevel: z.string(),
  warningMessage: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const VariableSchema = z.object({
  name: z.string(),
  value: z.unknown(),
  settable: z.boolean(),
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SettingSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  value: z.unknown(),
  defaultValue: z.unknown(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RequiredResourceSchema = z.object({
  id: z.string().optional(),
  kind: z.string(),
  name: z.string(),
  resource: z.string(),
  version: z.number(),
})
