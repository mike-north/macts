/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { SchemeActionResultStatus } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { WorkspaceDocument } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type WorkspaceDocumentCreateInput =
  import('./contract/index.js').WorkspaceDocumentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type WorkspaceDocumentUpdateInput =
  import('./contract/index.js').WorkspaceDocumentUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { FileDocument } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FileDocumentCreateInput = import('./contract/index.js').FileDocumentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FileDocumentUpdateInput = import('./contract/index.js').FileDocumentUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TextDocument } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TextDocumentCreateInput = import('./contract/index.js').TextDocumentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TextDocumentUpdateInput = import('./contract/index.js').TextDocumentUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SourceDocument } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SourceDocumentCreateInput = import('./contract/index.js').SourceDocumentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SourceDocumentUpdateInput = import('./contract/index.js').SourceDocumentUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Project } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ProjectCreateInput = import('./contract/index.js').ProjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ProjectUpdateInput = import('./contract/index.js').ProjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Target } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TargetCreateInput = import('./contract/index.js').TargetCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TargetUpdateInput = import('./contract/index.js').TargetUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BuildConfiguration } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BuildConfigurationCreateInput =
  import('./contract/index.js').BuildConfigurationCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type BuildConfigurationUpdateInput =
  import('./contract/index.js').BuildConfigurationUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BuildSetting } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BuildSettingCreateInput = import('./contract/index.js').BuildSettingCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type BuildSettingUpdateInput = import('./contract/index.js').BuildSettingUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ResolvedBuildSetting } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ResolvedBuildSettingCreateInput =
  import('./contract/index.js').ResolvedBuildSettingCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ResolvedBuildSettingUpdateInput =
  import('./contract/index.js').ResolvedBuildSettingUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Scheme } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SchemeCreateInput = import('./contract/index.js').SchemeCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SchemeUpdateInput = import('./contract/index.js').SchemeUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RunDestination } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type RunDestinationCreateInput = import('./contract/index.js').RunDestinationCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type RunDestinationUpdateInput = import('./contract/index.js').RunDestinationUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Device } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DeviceCreateInput = import('./contract/index.js').DeviceCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DeviceUpdateInput = import('./contract/index.js').DeviceUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SchemeActionResult } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SchemeActionResultCreateInput =
  import('./contract/index.js').SchemeActionResultCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SchemeActionResultUpdateInput =
  import('./contract/index.js').SchemeActionResultUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BuildError } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BuildErrorCreateInput = Omit<
  import('./contract/index.js').BuildErrorCreateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?:
    | number
    | Extract<import('./contract/index.js').BuildErrorCreateInput['startingLineNumber'], null>
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?:
    | number
    | Extract<import('./contract/index.js').BuildErrorCreateInput['endingLineNumber'], null>
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').BuildErrorCreateInput['startingColumnNumber'], null>
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').BuildErrorCreateInput['endingColumnNumber'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type BuildErrorUpdateInput = Omit<
  import('./contract/index.js').BuildErrorUpdateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?:
    | number
    | Extract<import('./contract/index.js').BuildErrorUpdateInput['startingLineNumber'], null>
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?:
    | number
    | Extract<import('./contract/index.js').BuildErrorUpdateInput['endingLineNumber'], null>
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').BuildErrorUpdateInput['startingColumnNumber'], null>
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').BuildErrorUpdateInput['endingColumnNumber'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BuildWarning } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BuildWarningCreateInput = Omit<
  import('./contract/index.js').BuildWarningCreateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?:
    | number
    | Extract<import('./contract/index.js').BuildWarningCreateInput['startingLineNumber'], null>
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?:
    | number
    | Extract<import('./contract/index.js').BuildWarningCreateInput['endingLineNumber'], null>
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').BuildWarningCreateInput['startingColumnNumber'], null>
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').BuildWarningCreateInput['endingColumnNumber'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type BuildWarningUpdateInput = Omit<
  import('./contract/index.js').BuildWarningUpdateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?:
    | number
    | Extract<import('./contract/index.js').BuildWarningUpdateInput['startingLineNumber'], null>
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?:
    | number
    | Extract<import('./contract/index.js').BuildWarningUpdateInput['endingLineNumber'], null>
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').BuildWarningUpdateInput['startingColumnNumber'], null>
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').BuildWarningUpdateInput['endingColumnNumber'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AnalyzerIssue } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AnalyzerIssueCreateInput = Omit<
  import('./contract/index.js').AnalyzerIssueCreateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?:
    | number
    | Extract<import('./contract/index.js').AnalyzerIssueCreateInput['startingLineNumber'], null>
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?:
    | number
    | Extract<import('./contract/index.js').AnalyzerIssueCreateInput['endingLineNumber'], null>
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').AnalyzerIssueCreateInput['startingColumnNumber'], null>
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').AnalyzerIssueCreateInput['endingColumnNumber'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type AnalyzerIssueUpdateInput = Omit<
  import('./contract/index.js').AnalyzerIssueUpdateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?:
    | number
    | Extract<import('./contract/index.js').AnalyzerIssueUpdateInput['startingLineNumber'], null>
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?:
    | number
    | Extract<import('./contract/index.js').AnalyzerIssueUpdateInput['endingLineNumber'], null>
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').AnalyzerIssueUpdateInput['startingColumnNumber'], null>
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').AnalyzerIssueUpdateInput['endingColumnNumber'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TestFailure } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TestFailureCreateInput = Omit<
  import('./contract/index.js').TestFailureCreateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?:
    | number
    | Extract<import('./contract/index.js').TestFailureCreateInput['startingLineNumber'], null>
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?:
    | number
    | Extract<import('./contract/index.js').TestFailureCreateInput['endingLineNumber'], null>
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').TestFailureCreateInput['startingColumnNumber'], null>
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').TestFailureCreateInput['endingColumnNumber'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TestFailureUpdateInput = Omit<
  import('./contract/index.js').TestFailureUpdateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?:
    | number
    | Extract<import('./contract/index.js').TestFailureUpdateInput['startingLineNumber'], null>
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?:
    | number
    | Extract<import('./contract/index.js').TestFailureUpdateInput['endingLineNumber'], null>
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').TestFailureUpdateInput['startingColumnNumber'], null>
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?:
    | number
    | Extract<import('./contract/index.js').TestFailureUpdateInput['endingColumnNumber'], null>
}

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const WorkspaceDocumentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  modified: z.boolean(),
  file: z.string(),
  path: z.string(),
  loaded: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FileDocumentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  modified: z.boolean(),
  file: z.string(),
  path: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TextDocumentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  modified: z.boolean(),
  file: z.string(),
  path: z.string(),
  selectedCharacterRange: z.unknown(),
  selectedParagraphRange: z.unknown(),
  text: z.string(),
  notifiesWhenClosing: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SourceDocumentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  modified: z.boolean(),
  file: z.string(),
  path: z.string(),
  selectedCharacterRange: z.unknown(),
  selectedParagraphRange: z.unknown(),
  text: z.string(),
  notifiesWhenClosing: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TargetSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BuildConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BuildSettingSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ResolvedBuildSettingSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SchemeSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RunDestinationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  architecture: z.string(),
  platform: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DeviceSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  deviceIdentifier: z.string(),
  operatingSystemVersion: z.string(),
  deviceModel: z.string(),
  generic: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SchemeActionResultSchema = z.object({
  id: z.string(),
  completed: z.boolean(),
  status: z.string(),
  errorMessage: z.string(),
  buildLog: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BuildErrorSchema = z.object({
  id: z.string().optional(),
  message: z.string(),
  filePath: z.string(),
  startingLineNumber: z.number(),
  endingLineNumber: z.number(),
  startingColumnNumber: z.number(),
  endingColumnNumber: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BuildWarningSchema = z.object({
  id: z.string().optional(),
  message: z.string(),
  filePath: z.string(),
  startingLineNumber: z.number(),
  endingLineNumber: z.number(),
  startingColumnNumber: z.number(),
  endingColumnNumber: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AnalyzerIssueSchema = z.object({
  id: z.string().optional(),
  message: z.string(),
  filePath: z.string(),
  startingLineNumber: z.number(),
  endingLineNumber: z.number(),
  startingColumnNumber: z.number(),
  endingColumnNumber: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TestFailureSchema = z.object({
  id: z.string().optional(),
  message: z.string(),
  filePath: z.string(),
  startingLineNumber: z.number(),
  endingLineNumber: z.number(),
  startingColumnNumber: z.number(),
  endingColumnNumber: z.number(),
})
