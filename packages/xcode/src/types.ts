/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** The status of a scheme action result object */
export type SchemeActionResultStatus = 'notYetStarted' | 'running' | 'cancelled' | 'failed' | 'errorOccurred' | 'succeeded';

/** A document that represents a workspace on disk. Workspaces are the top-level container for almost all objects and commands in Xcode */
export interface WorkspaceDocument {
  /** The name of the workspace */
  name: string;
  /** Has it been modified since the last save? */
  modified: boolean;
  /** Its location on disk, if it has one */
  file: string;
  /** The document's path */
  path: string;
  /** Whether the workspace document has finished loading after being opened */
  loaded: boolean;
  /** The workspace's scheme that will be used for scheme actions */
  activeScheme: Scheme;
  /** The workspace's run destination that will be used for scheme actions */
  activeRunDestination: RunDestination;
  /** The scheme action result for the last scheme action command issued to the workspace document */
  lastSchemeActionResult: SchemeActionResult;
}

/** Input for creating a WorkspaceDocument */
export interface WorkspaceDocumentCreateInput {
  /** The workspace's scheme that will be used for scheme actions */
  activeScheme?: Scheme;
  /** The workspace's run destination that will be used for scheme actions */
  activeRunDestination?: RunDestination;
}

/** Input for updating a WorkspaceDocument */
export type WorkspaceDocumentUpdateInput = Partial<WorkspaceDocumentCreateInput>;

/** A document that represents a file on disk */
export interface FileDocument {
  /** The name of the document */
  name: string;
  /** Has it been modified since the last save? */
  modified: boolean;
  /** Its location on disk, if it has one */
  file: string;
  /** The document's path */
  path: string;
}

/** Input for creating a FileDocument */
export interface FileDocumentCreateInput {
}

/** Input for updating a FileDocument */
export type FileDocumentUpdateInput = Partial<FileDocumentCreateInput>;

/** A document that represents a text file on disk */
export interface TextDocument {
  /** The name of the document */
  name: string;
  /** Has it been modified since the last save? */
  modified: boolean;
  /** Its location on disk, if it has one */
  file: string;
  /** The document's path */
  path: string;
  /** The first and last character positions in the selection */
  selectedCharacterRange: unknown;
  /** The first and last paragraph positions that contain the selection */
  selectedParagraphRange: unknown;
  /** The text of the text file referenced */
  text: string;
  /** Should Xcode notify other apps when this document is closed? */
  notifiesWhenClosing: boolean;
}

/** Input for creating a TextDocument */
export interface TextDocumentCreateInput {
  /** The first and last character positions in the selection */
  selectedCharacterRange?: unknown;
  /** The first and last paragraph positions that contain the selection */
  selectedParagraphRange?: unknown;
  /** The text of the text file referenced */
  text?: string;
  /** Should Xcode notify other apps when this document is closed? */
  notifiesWhenClosing?: boolean;
}

/** Input for updating a TextDocument */
export type TextDocumentUpdateInput = Partial<TextDocumentCreateInput>;

/** A document that represents a source file on disk */
export interface SourceDocument {
  /** The name of the document */
  name: string;
  /** Has it been modified since the last save? */
  modified: boolean;
  /** Its location on disk, if it has one */
  file: string;
  /** The document's path */
  path: string;
  /** The first and last character positions in the selection */
  selectedCharacterRange: unknown;
  /** The first and last paragraph positions that contain the selection */
  selectedParagraphRange: unknown;
  /** The text of the text file referenced */
  text: string;
  /** Should Xcode notify other apps when this document is closed? */
  notifiesWhenClosing: boolean;
}

/** Input for creating a SourceDocument */
export interface SourceDocumentCreateInput {
  /** The first and last character positions in the selection */
  selectedCharacterRange?: unknown;
  /** The first and last paragraph positions that contain the selection */
  selectedParagraphRange?: unknown;
  /** The text of the text file referenced */
  text?: string;
  /** Should Xcode notify other apps when this document is closed? */
  notifiesWhenClosing?: boolean;
}

/** Input for updating a SourceDocument */
export type SourceDocumentUpdateInput = Partial<SourceDocumentCreateInput>;

/** An Xcode project. Projects represent project files on disk and are always open in the context of a workspace document */
export interface Project {
  /** The unique identifier for the project */
  id: string;
  /** The name of the project */
  name: string;
}

/** Input for creating a Project */
export interface ProjectCreateInput {
}

/** Input for updating a Project */
export type ProjectUpdateInput = Partial<ProjectCreateInput>;

/** A target is a blueprint for building a product. Targets inherit build settings from their project if not overridden in the target */
export interface Target {
  /** The unique identifier for the target */
  id: string;
  /** The name of this target */
  name: string;
  /** The project that contains this target */
  project: Project;
}

/** Input for creating a Target */
export interface TargetCreateInput {
  /** The name of this target */
  name?: string;
}

/** Input for updating a Target */
export type TargetUpdateInput = Partial<TargetCreateInput>;

/** A set of build settings for a target or project. Each target in a project has the same named build configurations as the project */
export interface BuildConfiguration {
  /** The unique identifier for the build configuration */
  id: string;
  /** The name of the build configuration */
  name: string;
}

/** Input for creating a BuildConfiguration */
export interface BuildConfigurationCreateInput {
}

/** Input for updating a BuildConfiguration */
export type BuildConfigurationUpdateInput = Partial<BuildConfigurationCreateInput>;

/** A setting that controls how products are built */
export interface BuildSetting {
  /** The unlocalized build setting name (e.g. DSTROOT) */
  name: string;
  /** A string value for the build setting */
  value: string;
}

/** Input for creating a BuildSetting */
export interface BuildSettingCreateInput {
  /** The unlocalized build setting name (e.g. DSTROOT) */
  name?: string;
  /** A string value for the build setting */
  value?: string;
}

/** Input for updating a BuildSetting */
export type BuildSettingUpdateInput = Partial<BuildSettingCreateInput>;

/** An object that represents a resolved value for a build setting */
export interface ResolvedBuildSetting {
  /** The unlocalized build setting name (e.g. DSTROOT) */
  name: string;
  /** A string value for the build setting */
  value: string;
}

/** Input for creating a ResolvedBuildSetting */
export interface ResolvedBuildSettingCreateInput {
  /** The unlocalized build setting name (e.g. DSTROOT) */
  name?: string;
  /** A string value for the build setting */
  value?: string;
}

/** Input for updating a ResolvedBuildSetting */
export type ResolvedBuildSettingUpdateInput = Partial<ResolvedBuildSettingCreateInput>;

/** A set of parameters for building, testing, launching or distributing the products of a workspace */
export interface Scheme {
  /** The unique identifier for the scheme */
  id: string;
  /** The name of the scheme */
  name: string;
}

/** Input for creating a Scheme */
export interface SchemeCreateInput {
}

/** Input for updating a Scheme */
export type SchemeUpdateInput = Partial<SchemeCreateInput>;

/** An object which specifies parameters such as the device and architecture for which to perform a scheme action */
export interface RunDestination {
  /** The name of the run destination, as displayed in Xcode's interface */
  name: string;
  /** The architecture for which this run destination results in execution */
  architecture: string;
  /** The identifier of the platform which this run destination targets */
  platform: string;
  /** The physical or virtual device which this run destination targets */
  device: Device;
  /** If the run destination's device has a companion, this is that device */
  companionDevice: Device;
}

/** Input for creating a RunDestination */
export interface RunDestinationCreateInput {
}

/** Input for updating a RunDestination */
export type RunDestinationUpdateInput = Partial<RunDestinationCreateInput>;

/** A device which can be used as the target for a scheme action, as part of a run destination */
export interface Device {
  /** The name of the device */
  name: string;
  /** A stable identifier for the device */
  deviceIdentifier: string;
  /** The version of the operating system installed on the device */
  operatingSystemVersion: string;
  /** The model of device */
  deviceModel: string;
  /** Whether this run destination is generic instead of representing a specific device */
  generic: boolean;
}

/** Input for creating a Device */
export interface DeviceCreateInput {
}

/** Input for updating a Device */
export type DeviceUpdateInput = Partial<DeviceCreateInput>;

/** An object describing the result of performing a scheme action command */
export interface SchemeActionResult {
  /** The unique identifier for the scheme action result */
  id: string;
  /** Whether this scheme action has completed (successfully or otherwise) or not */
  completed: boolean;
  /** Indicates the status of the scheme action */
  status: SchemeActionResultStatus;
  /** If the result's status is "error occurred", this will be the error message */
  errorMessage: string;
  /** If this scheme action performed a build, this will be the text of the build log */
  buildLog: string;
}

/** Input for creating a SchemeActionResult */
export interface SchemeActionResultCreateInput {
  /** Indicates the status of the scheme action */
  status?: SchemeActionResultStatus;
  /** If the result's status is "error occurred", this will be the error message */
  errorMessage?: string;
  /** If this scheme action performed a build, this will be the text of the build log */
  buildLog?: string;
}

/** Input for updating a SchemeActionResult */
export type SchemeActionResultUpdateInput = Partial<SchemeActionResultCreateInput>;

/** An error generated by a build */
export interface BuildError {
  /** The text of the issue */
  message: string;
  /** The file path where the issue occurred */
  filePath: string;
  /** The starting line number in the file where the issue occurred */
  startingLineNumber: number;
  /** The ending line number in the file where the issue occurred */
  endingLineNumber: number;
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber: number;
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber: number;
}

/** Input for creating a BuildError */
export interface BuildErrorCreateInput {
  /** The text of the issue */
  message?: string;
  /** The file path where the issue occurred */
  filePath?: string;
  /** The starting line number in the file where the issue occurred */
  startingLineNumber?: number;
  /** The ending line number in the file where the issue occurred */
  endingLineNumber?: number;
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber?: number;
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber?: number;
}

/** Input for updating a BuildError */
export type BuildErrorUpdateInput = Partial<BuildErrorCreateInput>;

/** A warning generated by a build */
export interface BuildWarning {
  /** The text of the issue */
  message: string;
  /** The file path where the issue occurred */
  filePath: string;
  /** The starting line number in the file where the issue occurred */
  startingLineNumber: number;
  /** The ending line number in the file where the issue occurred */
  endingLineNumber: number;
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber: number;
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber: number;
}

/** Input for creating a BuildWarning */
export interface BuildWarningCreateInput {
  /** The text of the issue */
  message?: string;
  /** The file path where the issue occurred */
  filePath?: string;
  /** The starting line number in the file where the issue occurred */
  startingLineNumber?: number;
  /** The ending line number in the file where the issue occurred */
  endingLineNumber?: number;
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber?: number;
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber?: number;
}

/** Input for updating a BuildWarning */
export type BuildWarningUpdateInput = Partial<BuildWarningCreateInput>;

/** A warning generated by the static analyzer */
export interface AnalyzerIssue {
  /** The text of the issue */
  message: string;
  /** The file path where the issue occurred */
  filePath: string;
  /** The starting line number in the file where the issue occurred */
  startingLineNumber: number;
  /** The ending line number in the file where the issue occurred */
  endingLineNumber: number;
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber: number;
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber: number;
}

/** Input for creating a AnalyzerIssue */
export interface AnalyzerIssueCreateInput {
  /** The text of the issue */
  message?: string;
  /** The file path where the issue occurred */
  filePath?: string;
  /** The starting line number in the file where the issue occurred */
  startingLineNumber?: number;
  /** The ending line number in the file where the issue occurred */
  endingLineNumber?: number;
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber?: number;
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber?: number;
}

/** Input for updating a AnalyzerIssue */
export type AnalyzerIssueUpdateInput = Partial<AnalyzerIssueCreateInput>;

/** A failure from a test */
export interface TestFailure {
  /** The text of the issue */
  message: string;
  /** The file path where the issue occurred */
  filePath: string;
  /** The starting line number in the file where the issue occurred */
  startingLineNumber: number;
  /** The ending line number in the file where the issue occurred */
  endingLineNumber: number;
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber: number;
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber: number;
}

/** Input for creating a TestFailure */
export interface TestFailureCreateInput {
  /** The text of the issue */
  message?: string;
  /** The file path where the issue occurred */
  filePath?: string;
  /** The starting line number in the file where the issue occurred */
  startingLineNumber?: number;
  /** The ending line number in the file where the issue occurred */
  endingLineNumber?: number;
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber?: number;
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber?: number;
}

/** Input for updating a TestFailure */
export type TestFailureUpdateInput = Partial<TestFailureCreateInput>;

// Zod schemas for runtime validation

export const WorkspaceDocumentSchema = z.object({
  name: z.string(),
  modified: z.boolean(),
  file: z.string(),
  path: z.string(),
  loaded: z.boolean(),
  activeScheme: z.string(),
  activeRunDestination: z.string(),
  lastSchemeActionResult: z.string(),
});

export const FileDocumentSchema = z.object({
  name: z.string(),
  modified: z.boolean(),
  file: z.string(),
  path: z.string(),
});

export const TextDocumentSchema = z.object({
  name: z.string(),
  modified: z.boolean(),
  file: z.string(),
  path: z.string(),
  selectedCharacterRange: z.unknown(),
  selectedParagraphRange: z.unknown(),
  text: z.string(),
  notifiesWhenClosing: z.boolean(),
});

export const SourceDocumentSchema = z.object({
  name: z.string(),
  modified: z.boolean(),
  file: z.string(),
  path: z.string(),
  selectedCharacterRange: z.unknown(),
  selectedParagraphRange: z.unknown(),
  text: z.string(),
  notifiesWhenClosing: z.boolean(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const TargetSchema = z.object({
  id: z.string(),
  name: z.string(),
  project: z.string(),
});

export const BuildConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const BuildSettingSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const ResolvedBuildSettingSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const SchemeSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const RunDestinationSchema = z.object({
  name: z.string(),
  architecture: z.string(),
  platform: z.string(),
  device: z.string(),
  companionDevice: z.string(),
});

export const DeviceSchema = z.object({
  name: z.string(),
  deviceIdentifier: z.string(),
  operatingSystemVersion: z.string(),
  deviceModel: z.string(),
  generic: z.boolean(),
});

export const SchemeActionResultSchema = z.object({
  id: z.string(),
  completed: z.boolean(),
  status: z.string(),
  errorMessage: z.string(),
  buildLog: z.string(),
});

export const BuildErrorSchema = z.object({
  message: z.string(),
  filePath: z.string(),
  startingLineNumber: z.number(),
  endingLineNumber: z.number(),
  startingColumnNumber: z.number(),
  endingColumnNumber: z.number(),
});

export const BuildWarningSchema = z.object({
  message: z.string(),
  filePath: z.string(),
  startingLineNumber: z.number(),
  endingLineNumber: z.number(),
  startingColumnNumber: z.number(),
  endingColumnNumber: z.number(),
});

export const AnalyzerIssueSchema = z.object({
  message: z.string(),
  filePath: z.string(),
  startingLineNumber: z.number(),
  endingLineNumber: z.number(),
  startingColumnNumber: z.number(),
  endingColumnNumber: z.number(),
});

export const TestFailureSchema = z.object({
  message: z.string(),
  filePath: z.string(),
  startingLineNumber: z.number(),
  endingLineNumber: z.number(),
  startingColumnNumber: z.number(),
  endingColumnNumber: z.number(),
});
