/**
 * The Xcode contract: the transport-neutral description of every
 * Xcode operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `XcodeClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `XcodeClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Xcode manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type FileValue,
  type Integer,
  type ObjectReferenceData,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type Page,
  type ResourceDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** The status of a scheme action result object */
export type SchemeActionResultStatus =
  | 'notYetStarted'
  | 'running'
  | 'cancelled'
  | 'failed'
  | 'errorOccurred'
  | 'succeeded'

/**
 * A document that represents a workspace on disk. Workspaces are the top-level container for almost
 * all objects and commands in Xcode
 */
export interface WorkspaceDocument {
  /**
   * The name of the workspace.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * Has it been modified since the last save?
   * Nullable. No evidence that the app always sets it.
   */
  readonly modified: boolean | null
  /**
   * Its location on disk, if it has one.
   * Nullable. No evidence that the app always sets it.
   */
  readonly file: FileValue | null
  /**
   * The document's path.
   * Nullable. No evidence that the app always sets it.
   */
  readonly path: string | null
  /**
   * Whether the workspace document has finished loading after being opened.
   * Nullable. No evidence that the app always sets it.
   */
  readonly loaded: boolean | null
  /**
   * The workspace's scheme that will be used for scheme actions.
   * Nullable. No evidence that the app always sets it.
   */
  activeScheme: ObjectReferenceVariant<Scheme, string, 'Scheme'> | null
}

/** A document that represents a file on disk */
export interface FileDocument {
  /**
   * The name of the document.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * Has it been modified since the last save?
   * Nullable. No evidence that the app always sets it.
   */
  readonly modified: boolean | null
  /**
   * Its location on disk, if it has one.
   * Nullable. No evidence that the app always sets it.
   */
  readonly file: FileValue | null
  /**
   * The document's path.
   * Nullable. No evidence that the app always sets it.
   */
  readonly path: string | null
}

/** A document that represents a text file on disk */
export interface TextDocument {
  /**
   * The name of the document.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * Has it been modified since the last save?
   * Nullable. No evidence that the app always sets it.
   */
  readonly modified: boolean | null
  /**
   * Its location on disk, if it has one.
   * Nullable. No evidence that the app always sets it.
   */
  readonly file: FileValue | null
  /**
   * The document's path.
   * Nullable. No evidence that the app always sets it.
   */
  readonly path: string | null
  /**
   * The first and last character positions in the selection.
   * Nullable. No evidence that the app always sets it.
   */
  selectedCharacterRange: unknown
  /**
   * The first and last paragraph positions that contain the selection.
   * Nullable. No evidence that the app always sets it.
   */
  selectedParagraphRange: unknown
  /**
   * The text of the text file referenced.
   * Nullable. No evidence that the app always sets it.
   */
  text: string | null
  /**
   * Should Xcode notify other apps when this document is closed?
   * Nullable. No evidence that the app always sets it.
   */
  notifiesWhenClosing: boolean | null
}

/** A document that represents a source file on disk */
export interface SourceDocument {
  /**
   * The name of the document.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * Has it been modified since the last save?
   * Nullable. No evidence that the app always sets it.
   */
  readonly modified: boolean | null
  /**
   * Its location on disk, if it has one.
   * Nullable. No evidence that the app always sets it.
   */
  readonly file: FileValue | null
  /**
   * The document's path.
   * Nullable. No evidence that the app always sets it.
   */
  readonly path: string | null
  /**
   * The first and last character positions in the selection.
   * Nullable. No evidence that the app always sets it.
   */
  selectedCharacterRange: unknown
  /**
   * The first and last paragraph positions that contain the selection.
   * Nullable. No evidence that the app always sets it.
   */
  selectedParagraphRange: unknown
  /**
   * The text of the text file referenced.
   * Nullable. No evidence that the app always sets it.
   */
  text: string | null
  /**
   * Should Xcode notify other apps when this document is closed?
   * Nullable. No evidence that the app always sets it.
   */
  notifiesWhenClosing: boolean | null
}

/**
 * An Xcode project. Projects represent project files on disk and are always open in the context of
 * a workspace document
 */
export interface Project {
  /**
   * The unique identifier for the project.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the project.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
}

/**
 * A target is a blueprint for building a product. Targets inherit build settings from their project
 * if not overridden in the target
 */
export interface Target {
  /**
   * The unique identifier for the target.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of this target.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The project that contains this target.
   * Nullable. No evidence that the app always sets it.
   */
  readonly project: ObjectReferenceVariant<Project, string, 'Project'> | null
}

/**
 * A set of build settings for a target or project. Each target in a project has the same named
 * build configurations as the project
 */
export interface BuildConfiguration {
  /**
   * The unique identifier for the build configuration.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the build configuration.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
}

/** A setting that controls how products are built */
export interface BuildSetting {
  /**
   * The unlocalized build setting name (e.g. DSTROOT).
   * Never null: the primary identifier.
   */
  name: string
  /**
   * A string value for the build setting.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** An object that represents a resolved value for a build setting */
export interface ResolvedBuildSetting {
  /**
   * The unlocalized build setting name (e.g. DSTROOT).
   * Never null: the primary identifier.
   */
  name: string
  /**
   * A string value for the build setting.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/**
 * A set of parameters for building, testing, launching or distributing the products of a workspace
 */
export interface Scheme {
  /**
   * The unique identifier for the scheme.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the scheme.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
}

/**
 * An object which specifies parameters such as the device and architecture for which to perform a
 * scheme action
 */
export interface RunDestination {
  /**
   * The name of the run destination, as displayed in Xcode's interface.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * The architecture for which this run destination results in execution.
   * Nullable. No evidence that the app always sets it.
   */
  readonly architecture: string | null
  /**
   * The identifier of the platform which this run destination targets.
   * Nullable. No evidence that the app always sets it.
   */
  readonly platform: string | null
}

/** A device which can be used as the target for a scheme action, as part of a run destination */
export interface Device {
  /**
   * The name of the device.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * A stable identifier for the device.
   * Never null: the primary identifier.
   */
  readonly deviceIdentifier: string
  /**
   * The version of the operating system installed on the device.
   * Nullable. No evidence that the app always sets it.
   */
  readonly operatingSystemVersion: string | null
  /**
   * The model of device.
   * Nullable. No evidence that the app always sets it.
   */
  readonly deviceModel: string | null
  /**
   * Whether this run destination is generic instead of representing a specific device.
   * Nullable. No evidence that the app always sets it.
   */
  readonly generic: boolean | null
}

/** An object describing the result of performing a scheme action command */
export interface SchemeActionResult {
  /**
   * The unique identifier for the scheme action result.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Whether this scheme action has completed (successfully or otherwise) or not.
   * Nullable. No evidence that the app always sets it.
   */
  readonly completed: boolean | null
  /**
   * Indicates the status of the scheme action.
   * Nullable. No evidence that the app always sets it.
   */
  status: SchemeActionResultStatus | null
  /**
   * If the result's status is "error occurred", this will be the error message.
   * Nullable. No evidence that the app always sets it.
   */
  errorMessage: string | null
  /**
   * If this scheme action performed a build, this will be the text of the build log.
   * Nullable. No evidence that the app always sets it.
   */
  buildLog: string | null
}

/** An error generated by a build */
export interface BuildError {
  /**
   * The text of the issue.
   * Never null: the primary identifier.
   */
  message: string
  /**
   * The file path where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  filePath: string | null
  /**
   * The starting line number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  startingLineNumber: Integer | null
  /**
   * The ending line number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  endingLineNumber: Integer | null
  /**
   * The starting column number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  startingColumnNumber: Integer | null
  /**
   * The ending column number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  endingColumnNumber: Integer | null
}

/** A warning generated by a build */
export interface BuildWarning {
  /**
   * The text of the issue.
   * Never null: the primary identifier.
   */
  message: string
  /**
   * The file path where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  filePath: string | null
  /**
   * The starting line number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  startingLineNumber: Integer | null
  /**
   * The ending line number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  endingLineNumber: Integer | null
  /**
   * The starting column number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  startingColumnNumber: Integer | null
  /**
   * The ending column number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  endingColumnNumber: Integer | null
}

/** A warning generated by the static analyzer */
export interface AnalyzerIssue {
  /**
   * The text of the issue.
   * Never null: the primary identifier.
   */
  message: string
  /**
   * The file path where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  filePath: string | null
  /**
   * The starting line number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  startingLineNumber: Integer | null
  /**
   * The ending line number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  endingLineNumber: Integer | null
  /**
   * The starting column number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  startingColumnNumber: Integer | null
  /**
   * The ending column number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  endingColumnNumber: Integer | null
}

/** A failure from a test */
export interface TestFailure {
  /**
   * The text of the issue.
   * Never null: the primary identifier.
   */
  message: string
  /**
   * The file path where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  filePath: string | null
  /**
   * The starting line number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  startingLineNumber: Integer | null
  /**
   * The ending line number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  endingLineNumber: Integer | null
  /**
   * The starting column number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  startingColumnNumber: Integer | null
  /**
   * The ending column number in the file where the issue occurred.
   * Nullable. No evidence that the app always sets it.
   */
  endingColumnNumber: Integer | null
}

/** Input for creating a WorkspaceDocument. */
export interface WorkspaceDocumentCreateInput {
  /** The workspace's scheme that will be used for scheme actions */
  activeScheme?: ObjectReferenceData<string, 'Scheme'>
  /** The workspace's run destination that will be used for scheme actions */
  activeRunDestination?: ObjectReferenceData<string, 'RunDestination'>
}

/** Input for updating a WorkspaceDocument. Omitted fields are left unchanged. */
export interface WorkspaceDocumentUpdateInput {
  /**
   * The workspace's scheme that will be used for scheme actions.
   * Cannot be reset: null is rejected.
   */
  activeScheme?: ObjectReferenceData<string, 'Scheme'>
  /**
   * The workspace's run destination that will be used for scheme actions.
   * Cannot be reset: null is rejected.
   */
  activeRunDestination?: ObjectReferenceData<string, 'RunDestination'>
}

/** Input for creating a FileDocument. */
export type FileDocumentCreateInput = Record<string, never>

/** Input for updating a FileDocument. Omitted fields are left unchanged. */
export type FileDocumentUpdateInput = Record<string, never>

/** Input for creating a TextDocument. */
export interface TextDocumentCreateInput {
  /** The first and last character positions in the selection */
  selectedCharacterRange?: unknown
  /** The first and last paragraph positions that contain the selection */
  selectedParagraphRange?: unknown
  /** The text of the text file referenced */
  text?: string
  /** Should Xcode notify other apps when this document is closed? */
  notifiesWhenClosing?: boolean
}

/** Input for updating a TextDocument. Omitted fields are left unchanged. */
export interface TextDocumentUpdateInput {
  /**
   * The first and last character positions in the selection.
   * Cannot be reset: null is rejected.
   */
  selectedCharacterRange?: unknown
  /**
   * The first and last paragraph positions that contain the selection.
   * Cannot be reset: null is rejected.
   */
  selectedParagraphRange?: unknown
  /**
   * The text of the text file referenced.
   * Cannot be reset: null is rejected.
   */
  text?: string
  /**
   * Should Xcode notify other apps when this document is closed?
   * Cannot be reset: null is rejected.
   */
  notifiesWhenClosing?: boolean
}

/** Input for creating a SourceDocument. */
export interface SourceDocumentCreateInput {
  /** The first and last character positions in the selection */
  selectedCharacterRange?: unknown
  /** The first and last paragraph positions that contain the selection */
  selectedParagraphRange?: unknown
  /** The text of the text file referenced */
  text?: string
  /** Should Xcode notify other apps when this document is closed? */
  notifiesWhenClosing?: boolean
}

/** Input for updating a SourceDocument. Omitted fields are left unchanged. */
export interface SourceDocumentUpdateInput {
  /**
   * The first and last character positions in the selection.
   * Cannot be reset: null is rejected.
   */
  selectedCharacterRange?: unknown
  /**
   * The first and last paragraph positions that contain the selection.
   * Cannot be reset: null is rejected.
   */
  selectedParagraphRange?: unknown
  /**
   * The text of the text file referenced.
   * Cannot be reset: null is rejected.
   */
  text?: string
  /**
   * Should Xcode notify other apps when this document is closed?
   * Cannot be reset: null is rejected.
   */
  notifiesWhenClosing?: boolean
}

/** Input for creating a Project. */
export type ProjectCreateInput = Record<string, never>

/** Input for updating a Project. Omitted fields are left unchanged. */
export type ProjectUpdateInput = Record<string, never>

/** Input for creating a Target. */
export interface TargetCreateInput {
  /** The name of this target */
  name?: string
}

/** Input for updating a Target. Omitted fields are left unchanged. */
export interface TargetUpdateInput {
  /**
   * The name of this target.
   * Cannot be reset: null is rejected.
   */
  name?: string
}

/** Input for creating a BuildConfiguration. */
export type BuildConfigurationCreateInput = Record<string, never>

/** Input for updating a BuildConfiguration. Omitted fields are left unchanged. */
export type BuildConfigurationUpdateInput = Record<string, never>

/** Input for creating a BuildSetting. */
export interface BuildSettingCreateInput {
  /** The unlocalized build setting name (e.g. DSTROOT) */
  name?: string
  /** A string value for the build setting */
  value?: string
}

/** Input for updating a BuildSetting. Omitted fields are left unchanged. */
export interface BuildSettingUpdateInput {
  /**
   * The unlocalized build setting name (e.g. DSTROOT).
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * A string value for the build setting.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a ResolvedBuildSetting. */
export interface ResolvedBuildSettingCreateInput {
  /** The unlocalized build setting name (e.g. DSTROOT) */
  name?: string
  /** A string value for the build setting */
  value?: string
}

/** Input for updating a ResolvedBuildSetting. Omitted fields are left unchanged. */
export interface ResolvedBuildSettingUpdateInput {
  /**
   * The unlocalized build setting name (e.g. DSTROOT).
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * A string value for the build setting.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a Scheme. */
export type SchemeCreateInput = Record<string, never>

/** Input for updating a Scheme. Omitted fields are left unchanged. */
export type SchemeUpdateInput = Record<string, never>

/** Input for creating a RunDestination. */
export type RunDestinationCreateInput = Record<string, never>

/** Input for updating a RunDestination. Omitted fields are left unchanged. */
export type RunDestinationUpdateInput = Record<string, never>

/** Input for creating a Device. */
export type DeviceCreateInput = Record<string, never>

/** Input for updating a Device. Omitted fields are left unchanged. */
export type DeviceUpdateInput = Record<string, never>

/** Input for creating a SchemeActionResult. */
export interface SchemeActionResultCreateInput {
  /** Indicates the status of the scheme action */
  status?: SchemeActionResultStatus
  /** If the result's status is "error occurred", this will be the error message */
  errorMessage?: string
  /** If this scheme action performed a build, this will be the text of the build log */
  buildLog?: string
}

/** Input for updating a SchemeActionResult. Omitted fields are left unchanged. */
export interface SchemeActionResultUpdateInput {
  /**
   * Indicates the status of the scheme action.
   * Cannot be reset: null is rejected.
   */
  status?: SchemeActionResultStatus
  /**
   * If the result's status is "error occurred", this will be the error message.
   * Cannot be reset: null is rejected.
   */
  errorMessage?: string
  /**
   * If this scheme action performed a build, this will be the text of the build log.
   * Cannot be reset: null is rejected.
   */
  buildLog?: string
}

/** Input for creating a BuildError. */
export interface BuildErrorCreateInput {
  /** The text of the issue */
  message?: string
  /** The file path where the issue occurred */
  filePath?: string
  /** The starting line number in the file where the issue occurred */
  startingLineNumber?: Integer
  /** The ending line number in the file where the issue occurred */
  endingLineNumber?: Integer
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber?: Integer
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber?: Integer
}

/** Input for updating a BuildError. Omitted fields are left unchanged. */
export interface BuildErrorUpdateInput {
  /**
   * The text of the issue.
   * Cannot be reset: null is rejected.
   */
  message?: string
  /**
   * The file path where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  filePath?: string
  /**
   * The starting line number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  startingLineNumber?: Integer
  /**
   * The ending line number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  endingLineNumber?: Integer
  /**
   * The starting column number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  startingColumnNumber?: Integer
  /**
   * The ending column number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  endingColumnNumber?: Integer
}

/** Input for creating a BuildWarning. */
export interface BuildWarningCreateInput {
  /** The text of the issue */
  message?: string
  /** The file path where the issue occurred */
  filePath?: string
  /** The starting line number in the file where the issue occurred */
  startingLineNumber?: Integer
  /** The ending line number in the file where the issue occurred */
  endingLineNumber?: Integer
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber?: Integer
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber?: Integer
}

/** Input for updating a BuildWarning. Omitted fields are left unchanged. */
export interface BuildWarningUpdateInput {
  /**
   * The text of the issue.
   * Cannot be reset: null is rejected.
   */
  message?: string
  /**
   * The file path where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  filePath?: string
  /**
   * The starting line number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  startingLineNumber?: Integer
  /**
   * The ending line number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  endingLineNumber?: Integer
  /**
   * The starting column number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  startingColumnNumber?: Integer
  /**
   * The ending column number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  endingColumnNumber?: Integer
}

/** Input for creating an AnalyzerIssue. */
export interface AnalyzerIssueCreateInput {
  /** The text of the issue */
  message?: string
  /** The file path where the issue occurred */
  filePath?: string
  /** The starting line number in the file where the issue occurred */
  startingLineNumber?: Integer
  /** The ending line number in the file where the issue occurred */
  endingLineNumber?: Integer
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber?: Integer
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber?: Integer
}

/** Input for updating an AnalyzerIssue. Omitted fields are left unchanged. */
export interface AnalyzerIssueUpdateInput {
  /**
   * The text of the issue.
   * Cannot be reset: null is rejected.
   */
  message?: string
  /**
   * The file path where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  filePath?: string
  /**
   * The starting line number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  startingLineNumber?: Integer
  /**
   * The ending line number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  endingLineNumber?: Integer
  /**
   * The starting column number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  startingColumnNumber?: Integer
  /**
   * The ending column number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  endingColumnNumber?: Integer
}

/** Input for creating a TestFailure. */
export interface TestFailureCreateInput {
  /** The text of the issue */
  message?: string
  /** The file path where the issue occurred */
  filePath?: string
  /** The starting line number in the file where the issue occurred */
  startingLineNumber?: Integer
  /** The ending line number in the file where the issue occurred */
  endingLineNumber?: Integer
  /** The starting column number in the file where the issue occurred */
  startingColumnNumber?: Integer
  /** The ending column number in the file where the issue occurred */
  endingColumnNumber?: Integer
}

/** Input for updating a TestFailure. Omitted fields are left unchanged. */
export interface TestFailureUpdateInput {
  /**
   * The text of the issue.
   * Cannot be reset: null is rejected.
   */
  message?: string
  /**
   * The file path where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  filePath?: string
  /**
   * The starting line number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  startingLineNumber?: Integer
  /**
   * The ending line number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  endingLineNumber?: Integer
  /**
   * The starting column number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  startingColumnNumber?: Integer
  /**
   * The ending column number in the file where the issue occurred.
   * Cannot be reset: null is rejected.
   */
  endingColumnNumber?: Integer
}

/**
 * A document that represents a workspace on disk. Workspaces are the top-level container for almost
 * all objects and commands in Xcode
 */
export interface WorkspaceDocumentResourceClient {
  /** List workspace documents, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<WorkspaceDocument>>
  /**
   * Read the workspace document identified by `name`.
   *
   * @param name - Workspace document name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<WorkspaceDocument>
  /**
   * Invoke the "build" scheme action
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   */
  build(workspaceName: string, options?: CallOptions): Promise<void>
  /**
   * Invoke the "clean" scheme action
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   */
  clean(workspaceName: string, options?: CallOptions): Promise<void>
  /**
   * Stop the active scheme action, if one is running
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   */
  stop(workspaceName: string, options?: CallOptions): Promise<void>
  /**
   * Invoke the "run" scheme action
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   * @param withCommandLineArguments - Additional command line arguments to pass to the action. Does
   * not accept null.
   * @param withEnvironmentVariables - Additional environment variables to set for the action. Does
   * not accept null.
   */
  run(
    workspaceName: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown,
    options?: CallOptions
  ): Promise<void>
  /**
   * Invoke the "test" scheme action
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   * @param withCommandLineArguments - Additional command line arguments to pass to the action. Does
   * not accept null.
   * @param withEnvironmentVariables - Additional environment variables to set for the action. Does
   * not accept null.
   */
  test(
    workspaceName: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown,
    options?: CallOptions
  ): Promise<void>
  /**
   * Start a new debugging session in the workspace
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   * @param toProcessIdentifier - The process identifier (pid) to which to attach. Does not accept
   * null.
   * @param suspended - Whether to start debugging in a suspended state. Does not accept null.
   */
  attach(
    workspaceName: string,
    toProcessIdentifier: Integer,
    suspended: boolean,
    options?: CallOptions
  ): Promise<void>
  /**
   * Start a debugging session using the "run" or "run without building" scheme action
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   * @param scheme - Scheme name. Does not accept null.
   * @param runDestinationSpecifier - Run destination specifier string. Does not accept null.
   * @param skipBuilding - Whether to perform "run without building" rather than "run". Does not
   * accept null.
   * @param commandLineArguments - Additional command line arguments to pass to the action. Does not
   * accept null.
   * @param environmentVariables - Additional environment variables to set for the action. Does not
   * accept null.
   */
  debug(
    workspaceName: string,
    scheme?: string,
    runDestinationSpecifier?: string,
    skipBuilding?: boolean,
    commandLineArguments?: unknown,
    environmentVariables?: unknown,
    options?: CallOptions
  ): Promise<void>
}

/**
 * An Xcode project. Projects represent project files on disk and are always open in the context of
 * a workspace document
 */
export interface ProjectResourceClient {
  /**
   * List projects, as one page holding all of them.
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   */
  list(workspaceName: string, options?: CallOptions): Promise<Page<Project>>
  /**
   * Read the project identified by `id`.
   *
   * @param id - Project identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Project>
}

/**
 * A set of parameters for building, testing, launching or distributing the products of a workspace
 */
export interface SchemeResourceClient {
  /**
   * List schemes, as one page holding all of them.
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   */
  list(workspaceName: string, options?: CallOptions): Promise<Page<Scheme>>
  /**
   * Read the scheme identified by `id`.
   *
   * @param id - Scheme identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Scheme>
}

/**
 * An object which specifies parameters such as the device and architecture for which to perform a
 * scheme action
 */
export interface RunDestinationResourceClient {
  /**
   * List run destinations, as one page holding all of them.
   *
   * @param workspaceName - Workspace document name. Does not accept null.
   */
  list(workspaceName: string, options?: CallOptions): Promise<Page<RunDestination>>
  /**
   * Read the run destination identified by `name`.
   *
   * @param name - Run destination name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<RunDestination>
}

/**
 * The Xcode client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link xcodeContract}. Its type carries the contract's resource
 * table, {@link XcodeResources}, so references can be bound to it by resource; the brand has no
 * runtime member.
 */
export interface XcodeClient extends ClientBrand<XcodeResources> {
  /**
   * A document that represents a workspace on disk. Workspaces are the top-level container for
   * almost all objects and commands in Xcode
   */
  readonly workspaceDocuments: WorkspaceDocumentResourceClient
  /**
   * An Xcode project. Projects represent project files on disk and are always open in the context
   * of a workspace document
   */
  readonly projects: ProjectResourceClient
  /**
   * A set of parameters for building, testing, launching or distributing the products of a
   * workspace
   */
  readonly schemes: SchemeResourceClient
  /**
   * An object which specifies parameters such as the device and architecture for which to perform a
   * scheme action
   */
  readonly runDestinations: RunDestinationResourceClient
}

const workspaceDocumentRecordType: ValueType<WorkspaceDocument> = t.record(
  {
    name: t.string({ description: 'The name of the workspace' }),
    modified: t.nullable(t.boolean(), { description: 'Has it been modified since the last save?' }),
    file: t.nullable(t.file(), { description: 'Its location on disk, if it has one' }),
    path: t.nullable(t.string(), { description: "The document's path" }),
    loaded: t.nullable(t.boolean(), {
      description: 'Whether the workspace document has finished loading after being opened',
    }),
    activeScheme: t.nullable(
      t.reference<Scheme, string, 'Scheme'>(() => xcodeContract, 'Scheme', 'one'),
      { description: "The workspace's scheme that will be used for scheme actions" }
    ),
  },
  {
    description:
      'A document that represents a workspace on disk. Workspaces are the top-level container for almost all objects and commands in Xcode',
  }
)

const projectRecordType: ValueType<Project> = t.record(
  {
    id: t.string({ description: 'The unique identifier for the project' }),
    name: t.nullable(t.string(), { description: 'The name of the project' }),
  },
  {
    description:
      'An Xcode project. Projects represent project files on disk and are always open in the context of a workspace document',
  }
)

const schemeRecordType: ValueType<Scheme> = t.record(
  {
    id: t.string({ description: 'The unique identifier for the scheme' }),
    name: t.nullable(t.string(), { description: 'The name of the scheme' }),
  },
  {
    description:
      'A set of parameters for building, testing, launching or distributing the products of a workspace',
  }
)

const runDestinationRecordType: ValueType<RunDestination> = t.record(
  {
    name: t.string({
      description: "The name of the run destination, as displayed in Xcode's interface",
    }),
    architecture: t.nullable(t.string(), {
      description: 'The architecture for which this run destination results in execution',
    }),
    platform: t.nullable(t.string(), {
      description: 'The identifier of the platform which this run destination targets',
    }),
  },
  {
    description:
      'An object which specifies parameters such as the device and architecture for which to perform a scheme action',
  }
)

/**
 * The type of the resource table of {@link xcodeContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), and the operations that resolve
 * references to it. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type XcodeResources = Readonly<{
  WorkspaceDocument: ResourceDescriptor<WorkspaceDocument, string> & {
    readonly id: ValueType<string>
    readonly get: 'xcode.workspaceDocuments.get'
    readonly list: 'xcode.workspaceDocuments.list'
  }
  Project: ResourceDescriptor<Project, string> & {
    readonly id: ValueType<string>
    readonly get: 'xcode.projects.get'
    readonly list: 'xcode.projects.list'
  }
  Scheme: ResourceDescriptor<Scheme, string> & {
    readonly id: ValueType<string>
    readonly get: 'xcode.schemes.get'
    readonly list: 'xcode.schemes.list'
  }
  RunDestination: ResourceDescriptor<RunDestination, string> & {
    readonly id: ValueType<string>
    readonly get: 'xcode.runDestinations.get'
    readonly list: 'xcode.runDestinations.list'
  }
}>

/**
 * The resource table: the implementation of {@link XcodeResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
  WorkspaceDocument: {
    name: 'WorkspaceDocument',
    record: workspaceDocumentRecordType,
    id: t.string({ description: 'The name of the workspace' }),
    get: 'xcode.workspaceDocuments.get',
    list: 'xcode.workspaceDocuments.list',
  },
  Project: {
    name: 'Project',
    record: projectRecordType,
    id: t.string({ description: 'The unique identifier for the project' }),
    get: 'xcode.projects.get',
    list: 'xcode.projects.list',
  },
  Scheme: {
    name: 'Scheme',
    record: schemeRecordType,
    id: t.string({ description: 'The unique identifier for the scheme' }),
    get: 'xcode.schemes.get',
    list: 'xcode.schemes.list',
  },
  RunDestination: {
    name: 'RunDestination',
    record: runDestinationRecordType,
    id: t.string({
      description: "The name of the run destination, as displayed in Xcode's interface",
    }),
    get: 'xcode.runDestinations.get',
    list: 'xcode.runDestinations.list',
  },
} satisfies XcodeResources

const workspaceDocumentListWorkspaceDocumentsOperation: OperationDescriptor<
  Record<string, never>,
  Page<WorkspaceDocument>
> = {
  id: 'xcode.workspaceDocuments.list',
  permission: 'xcode:workspaceDocuments:list',
  target: { command: 'listWorkspaceDocuments', resource: 'WorkspaceDocument' },
  description: 'List all workspace documents',
  input: t.record({}),
  output: t.page(workspaceDocumentRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const workspaceDocumentGetWorkspaceDocumentOperation: OperationDescriptor<
  { readonly name: string },
  WorkspaceDocument
> = {
  id: 'xcode.workspaceDocuments.get',
  permission: 'xcode:workspaceDocuments:get',
  target: { command: 'getWorkspaceDocument', resource: 'WorkspaceDocument' },
  description: 'Get a workspace document by name',
  input: t.record({
    name: t.string({ description: 'Workspace document name' }),
  }),
  output: workspaceDocumentRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Workspace document name' } },
    required: ['name'],
    additionalProperties: false,
  },
}

const projectListProjectsOperation: OperationDescriptor<
  { readonly workspaceName: string },
  Page<Project>
> = {
  id: 'xcode.projects.list',
  permission: 'xcode:projects:list',
  target: { command: 'listProjects', resource: 'Project' },
  description: 'List all projects in a workspace',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
  }),
  output: t.page(projectRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { workspaceName: { type: 'string', description: 'Workspace document name' } },
    required: ['workspaceName'],
    additionalProperties: false,
  },
}

const projectGetProjectOperation: OperationDescriptor<{ readonly id: string }, Project> = {
  id: 'xcode.projects.get',
  permission: 'xcode:projects:get',
  target: { command: 'getProject', resource: 'Project' },
  description: 'Get a project by ID',
  input: t.record({
    id: t.string({ description: 'Project identifier' }),
  }),
  output: projectRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Project identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const schemeListSchemesOperation: OperationDescriptor<
  { readonly workspaceName: string },
  Page<Scheme>
> = {
  id: 'xcode.schemes.list',
  permission: 'xcode:schemes:list',
  target: { command: 'listSchemes', resource: 'Scheme' },
  description: 'List all schemes in a workspace',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
  }),
  output: t.page(schemeRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { workspaceName: { type: 'string', description: 'Workspace document name' } },
    required: ['workspaceName'],
    additionalProperties: false,
  },
}

const schemeGetSchemeOperation: OperationDescriptor<{ readonly id: string }, Scheme> = {
  id: 'xcode.schemes.get',
  permission: 'xcode:schemes:get',
  target: { command: 'getScheme', resource: 'Scheme' },
  description: 'Get a scheme by ID',
  input: t.record({
    id: t.string({ description: 'Scheme identifier' }),
  }),
  output: schemeRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Scheme identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const runDestinationListRunDestinationsOperation: OperationDescriptor<
  { readonly workspaceName: string },
  Page<RunDestination>
> = {
  id: 'xcode.runDestinations.list',
  permission: 'xcode:runDestinations:list',
  target: { command: 'listRunDestinations', resource: 'RunDestination' },
  description: 'List all run destinations in a workspace',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
  }),
  output: t.page(runDestinationRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { workspaceName: { type: 'string', description: 'Workspace document name' } },
    required: ['workspaceName'],
    additionalProperties: false,
  },
}

const runDestinationGetRunDestinationOperation: OperationDescriptor<
  { readonly name: string },
  RunDestination
> = {
  id: 'xcode.runDestinations.get',
  permission: 'xcode:runDestinations:get',
  target: { command: 'getRunDestination', resource: 'RunDestination' },
  description: 'Get a run destination by name',
  input: t.record({
    name: t.string({ description: 'Run destination name' }),
  }),
  output: runDestinationRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Run destination name' } },
    required: ['name'],
    additionalProperties: false,
  },
}

const workspaceDocumentBuildOperation: OperationDescriptor<
  { readonly workspaceName: string },
  undefined
> = {
  id: 'xcode.workspaceDocuments.build',
  permission: 'xcode:workspace:build',
  target: { command: 'build', resource: 'WorkspaceDocument' },
  description: 'Invoke the "build" scheme action',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { workspaceName: { type: 'string', description: 'Workspace document name' } },
    required: ['workspaceName'],
    additionalProperties: false,
  },
}

const workspaceDocumentCleanOperation: OperationDescriptor<
  { readonly workspaceName: string },
  undefined
> = {
  id: 'xcode.workspaceDocuments.clean',
  permission: 'xcode:workspace:clean',
  target: { command: 'clean', resource: 'WorkspaceDocument' },
  description: 'Invoke the "clean" scheme action',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { workspaceName: { type: 'string', description: 'Workspace document name' } },
    required: ['workspaceName'],
    additionalProperties: false,
  },
}

const workspaceDocumentStopOperation: OperationDescriptor<
  { readonly workspaceName: string },
  undefined
> = {
  id: 'xcode.workspaceDocuments.stop',
  permission: 'xcode:workspace:stop',
  target: { command: 'stop', resource: 'WorkspaceDocument' },
  description: 'Stop the active scheme action, if one is running',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { workspaceName: { type: 'string', description: 'Workspace document name' } },
    required: ['workspaceName'],
    additionalProperties: false,
  },
}

const workspaceDocumentRunOperation: OperationDescriptor<
  {
    readonly workspaceName: string
    readonly withCommandLineArguments?: unknown
    readonly withEnvironmentVariables?: unknown
  },
  undefined
> = {
  id: 'xcode.workspaceDocuments.run',
  permission: 'xcode:workspace:run',
  target: { command: 'run', resource: 'WorkspaceDocument' },
  description: 'Invoke the "run" scheme action',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
    withCommandLineArguments: t.optional(
      t.unknown({ description: 'Additional command line arguments to pass to the action' })
    ),
    withEnvironmentVariables: t.optional(
      t.unknown({ description: 'Additional environment variables to set for the action' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      workspaceName: { type: 'string', description: 'Workspace document name' },
      withCommandLineArguments: {
        allOf: [
          {
            description: 'Additional command line arguments to pass to the action',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
      withEnvironmentVariables: {
        allOf: [
          {
            description: 'Additional environment variables to set for the action',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
    required: ['workspaceName'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

const workspaceDocumentTestOperation: OperationDescriptor<
  {
    readonly workspaceName: string
    readonly withCommandLineArguments?: unknown
    readonly withEnvironmentVariables?: unknown
  },
  undefined
> = {
  id: 'xcode.workspaceDocuments.test',
  permission: 'xcode:workspace:test',
  target: { command: 'test', resource: 'WorkspaceDocument' },
  description: 'Invoke the "test" scheme action',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
    withCommandLineArguments: t.optional(
      t.unknown({ description: 'Additional command line arguments to pass to the action' })
    ),
    withEnvironmentVariables: t.optional(
      t.unknown({ description: 'Additional environment variables to set for the action' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      workspaceName: { type: 'string', description: 'Workspace document name' },
      withCommandLineArguments: {
        allOf: [
          {
            description: 'Additional command line arguments to pass to the action',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
      withEnvironmentVariables: {
        allOf: [
          {
            description: 'Additional environment variables to set for the action',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
    required: ['workspaceName'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

const workspaceDocumentAttachOperation: OperationDescriptor<
  {
    readonly workspaceName: string
    readonly toProcessIdentifier: Integer
    readonly suspended: boolean
  },
  undefined
> = {
  id: 'xcode.workspaceDocuments.attach',
  permission: 'xcode:workspace:attach',
  target: { command: 'attach', resource: 'WorkspaceDocument' },
  description: 'Start a new debugging session in the workspace',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
    toProcessIdentifier: t.integer({
      description: 'The process identifier (pid) to which to attach',
    }),
    suspended: t.boolean({ description: 'Whether to start debugging in a suspended state' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      workspaceName: { type: 'string', description: 'Workspace document name' },
      toProcessIdentifier: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'The process identifier (pid) to which to attach',
      },
      suspended: {
        type: 'boolean',
        description: 'Whether to start debugging in a suspended state',
      },
    },
    required: ['workspaceName', 'toProcessIdentifier', 'suspended'],
    additionalProperties: false,
  },
}

const workspaceDocumentDebugOperation: OperationDescriptor<
  {
    readonly workspaceName: string
    readonly scheme?: string | undefined
    readonly runDestinationSpecifier?: string | undefined
    readonly skipBuilding?: boolean | undefined
    readonly commandLineArguments?: unknown
    readonly environmentVariables?: unknown
  },
  undefined
> = {
  id: 'xcode.workspaceDocuments.debug',
  permission: 'xcode:workspace:debug',
  target: { command: 'debug', resource: 'WorkspaceDocument' },
  description: 'Start a debugging session using the "run" or "run without building" scheme action',
  input: t.record({
    workspaceName: t.string({ description: 'Workspace document name' }),
    scheme: t.optional(t.string({ description: 'Scheme name' })),
    runDestinationSpecifier: t.optional(
      t.string({ description: 'Run destination specifier string' })
    ),
    skipBuilding: t.optional(
      t.boolean({ description: 'Whether to perform "run without building" rather than "run"' })
    ),
    commandLineArguments: t.optional(
      t.unknown({ description: 'Additional command line arguments to pass to the action' })
    ),
    environmentVariables: t.optional(
      t.unknown({ description: 'Additional environment variables to set for the action' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      workspaceName: { type: 'string', description: 'Workspace document name' },
      scheme: { type: 'string', description: 'Scheme name' },
      runDestinationSpecifier: { type: 'string', description: 'Run destination specifier string' },
      skipBuilding: {
        type: 'boolean',
        description: 'Whether to perform "run without building" rather than "run"',
      },
      commandLineArguments: {
        allOf: [
          {
            description: 'Additional command line arguments to pass to the action',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
      environmentVariables: {
        allOf: [
          {
            description: 'Additional environment variables to set for the action',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
    required: ['workspaceName'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<XcodeClient>['operations'] = {
  'xcode.workspaceDocuments.list': workspaceDocumentListWorkspaceDocumentsOperation,
  'xcode.workspaceDocuments.get': workspaceDocumentGetWorkspaceDocumentOperation,
  'xcode.projects.list': projectListProjectsOperation,
  'xcode.projects.get': projectGetProjectOperation,
  'xcode.schemes.list': schemeListSchemesOperation,
  'xcode.schemes.get': schemeGetSchemeOperation,
  'xcode.runDestinations.list': runDestinationListRunDestinationsOperation,
  'xcode.runDestinations.get': runDestinationGetRunDestinationOperation,
  'xcode.workspaceDocuments.build': workspaceDocumentBuildOperation,
  'xcode.workspaceDocuments.clean': workspaceDocumentCleanOperation,
  'xcode.workspaceDocuments.stop': workspaceDocumentStopOperation,
  'xcode.workspaceDocuments.run': workspaceDocumentRunOperation,
  'xcode.workspaceDocuments.test': workspaceDocumentTestOperation,
  'xcode.workspaceDocuments.attach': workspaceDocumentAttachOperation,
  'xcode.workspaceDocuments.debug': workspaceDocumentDebugOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): XcodeClient {
  return {
    workspaceDocuments: {
      list: (options) =>
        runtime.invoke(workspaceDocumentListWorkspaceDocumentsOperation, {}, options),
      get: (name, options) =>
        runtime.invoke(workspaceDocumentGetWorkspaceDocumentOperation, { name }, options),
      build: (workspaceName, options) =>
        runtime.invoke(workspaceDocumentBuildOperation, { workspaceName }, options),
      clean: (workspaceName, options) =>
        runtime.invoke(workspaceDocumentCleanOperation, { workspaceName }, options),
      stop: (workspaceName, options) =>
        runtime.invoke(workspaceDocumentStopOperation, { workspaceName }, options),
      run: (workspaceName, withCommandLineArguments, withEnvironmentVariables, options) =>
        runtime.invoke(
          workspaceDocumentRunOperation,
          { workspaceName, withCommandLineArguments, withEnvironmentVariables },
          options
        ),
      test: (workspaceName, withCommandLineArguments, withEnvironmentVariables, options) =>
        runtime.invoke(
          workspaceDocumentTestOperation,
          { workspaceName, withCommandLineArguments, withEnvironmentVariables },
          options
        ),
      attach: (workspaceName, toProcessIdentifier, suspended, options) =>
        runtime.invoke(
          workspaceDocumentAttachOperation,
          { workspaceName, toProcessIdentifier, suspended },
          options
        ),
      debug: (
        workspaceName,
        scheme,
        runDestinationSpecifier,
        skipBuilding,
        commandLineArguments,
        environmentVariables,
        options
      ) =>
        runtime.invoke(
          workspaceDocumentDebugOperation,
          {
            workspaceName,
            scheme,
            runDestinationSpecifier,
            skipBuilding,
            commandLineArguments,
            environmentVariables,
          },
          options
        ),
    },
    projects: {
      list: (workspaceName, options) =>
        runtime.invoke(projectListProjectsOperation, { workspaceName }, options),
      get: (id, options) => runtime.invoke(projectGetProjectOperation, { id }, options),
    },
    schemes: {
      list: (workspaceName, options) =>
        runtime.invoke(schemeListSchemesOperation, { workspaceName }, options),
      get: (id, options) => runtime.invoke(schemeGetSchemeOperation, { id }, options),
    },
    runDestinations: {
      list: (workspaceName, options) =>
        runtime.invoke(runDestinationListRunDestinationsOperation, { workspaceName }, options),
      get: (name, options) =>
        runtime.invoke(runDestinationGetRunDestinationOperation, { name }, options),
    },
  }
}

/**
 * The Xcode contract. Pass it to a client factory to obtain a
 * {@link XcodeClient}.
 */
export const xcodeContract: AppContract<XcodeClient, XcodeResources> = {
  app: 'xcode',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
