/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { SchemeActionResultStatus } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { WorkspaceDocument } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { WorkspaceDocumentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { WorkspaceDocumentUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { FileDocument } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FileDocumentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FileDocumentUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TextDocument } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TextDocumentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TextDocumentUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SourceDocument } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SourceDocumentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SourceDocumentUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Project } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ProjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ProjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Target } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TargetCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TargetUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BuildConfiguration } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { BuildConfigurationCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { BuildConfigurationUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BuildSetting } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { BuildSettingCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { BuildSettingUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ResolvedBuildSetting } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ResolvedBuildSettingCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ResolvedBuildSettingUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Scheme } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SchemeCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SchemeUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RunDestination } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RunDestinationCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RunDestinationUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Device } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DeviceCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DeviceUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SchemeActionResult } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SchemeActionResultCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SchemeActionResultUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BuildError } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BuildErrorCreateInput = Omit<
  import('./contract/index.js').BuildErrorCreateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?: null extends import('./contract/index.js').BuildErrorCreateInput['startingLineNumber']
    ? number | null
    : number
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?: null extends import('./contract/index.js').BuildErrorCreateInput['endingLineNumber']
    ? number | null
    : number
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?: null extends import('./contract/index.js').BuildErrorCreateInput['startingColumnNumber']
    ? number | null
    : number
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?: null extends import('./contract/index.js').BuildErrorCreateInput['endingColumnNumber']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type BuildErrorUpdateInput = Omit<
  import('./contract/index.js').BuildErrorUpdateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?: null extends import('./contract/index.js').BuildErrorUpdateInput['startingLineNumber']
    ? number | null
    : number
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?: null extends import('./contract/index.js').BuildErrorUpdateInput['endingLineNumber']
    ? number | null
    : number
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?: null extends import('./contract/index.js').BuildErrorUpdateInput['startingColumnNumber']
    ? number | null
    : number
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?: null extends import('./contract/index.js').BuildErrorUpdateInput['endingColumnNumber']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BuildWarning } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BuildWarningCreateInput = Omit<
  import('./contract/index.js').BuildWarningCreateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?: null extends import('./contract/index.js').BuildWarningCreateInput['startingLineNumber']
    ? number | null
    : number
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?: null extends import('./contract/index.js').BuildWarningCreateInput['endingLineNumber']
    ? number | null
    : number
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?: null extends import('./contract/index.js').BuildWarningCreateInput['startingColumnNumber']
    ? number | null
    : number
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?: null extends import('./contract/index.js').BuildWarningCreateInput['endingColumnNumber']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type BuildWarningUpdateInput = Omit<
  import('./contract/index.js').BuildWarningUpdateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?: null extends import('./contract/index.js').BuildWarningUpdateInput['startingLineNumber']
    ? number | null
    : number
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?: null extends import('./contract/index.js').BuildWarningUpdateInput['endingLineNumber']
    ? number | null
    : number
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?: null extends import('./contract/index.js').BuildWarningUpdateInput['startingColumnNumber']
    ? number | null
    : number
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?: null extends import('./contract/index.js').BuildWarningUpdateInput['endingColumnNumber']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AnalyzerIssue } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AnalyzerIssueCreateInput = Omit<
  import('./contract/index.js').AnalyzerIssueCreateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?: null extends import('./contract/index.js').AnalyzerIssueCreateInput['startingLineNumber']
    ? number | null
    : number
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?: null extends import('./contract/index.js').AnalyzerIssueCreateInput['endingLineNumber']
    ? number | null
    : number
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?: null extends import('./contract/index.js').AnalyzerIssueCreateInput['startingColumnNumber']
    ? number | null
    : number
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?: null extends import('./contract/index.js').AnalyzerIssueCreateInput['endingColumnNumber']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type AnalyzerIssueUpdateInput = Omit<
  import('./contract/index.js').AnalyzerIssueUpdateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?: null extends import('./contract/index.js').AnalyzerIssueUpdateInput['startingLineNumber']
    ? number | null
    : number
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?: null extends import('./contract/index.js').AnalyzerIssueUpdateInput['endingLineNumber']
    ? number | null
    : number
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?: null extends import('./contract/index.js').AnalyzerIssueUpdateInput['startingColumnNumber']
    ? number | null
    : number
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?: null extends import('./contract/index.js').AnalyzerIssueUpdateInput['endingColumnNumber']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TestFailure } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TestFailureCreateInput = Omit<
  import('./contract/index.js').TestFailureCreateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?: null extends import('./contract/index.js').TestFailureCreateInput['startingLineNumber']
    ? number | null
    : number
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?: null extends import('./contract/index.js').TestFailureCreateInput['endingLineNumber']
    ? number | null
    : number
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?: null extends import('./contract/index.js').TestFailureCreateInput['startingColumnNumber']
    ? number | null
    : number
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?: null extends import('./contract/index.js').TestFailureCreateInput['endingColumnNumber']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TestFailureUpdateInput = Omit<
  import('./contract/index.js').TestFailureUpdateInput,
  'startingLineNumber' | 'endingLineNumber' | 'startingColumnNumber' | 'endingColumnNumber'
> & {
  /** The starting line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingLineNumber?: null extends import('./contract/index.js').TestFailureUpdateInput['startingLineNumber']
    ? number | null
    : number
  /** The ending line number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingLineNumber?: null extends import('./contract/index.js').TestFailureUpdateInput['endingLineNumber']
    ? number | null
    : number
  /** The starting column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  startingColumnNumber?: null extends import('./contract/index.js').TestFailureUpdateInput['startingColumnNumber']
    ? number | null
    : number
  /** The ending column number in the file where the issue occurred Numeric values are validated by the contract before dispatch. */
  endingColumnNumber?: null extends import('./contract/index.js').TestFailureUpdateInput['endingColumnNumber']
    ? number | null
    : number
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
