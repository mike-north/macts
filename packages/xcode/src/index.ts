/**
 * Xcode HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { XcodeClient } from '@macts/sdk-xcode';
 *
 * const client = new XcodeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { XcodeClient, XcodeError, HttpClient } from './client.js'
export type { XcodeClientOptions } from './client.js'
export * from './types.js'
export { WorkspaceDocumentResourceClient } from './resources/workspacedocument.js'
export { FileDocumentResourceClient } from './resources/filedocument.js'
export { TextDocumentResourceClient } from './resources/textdocument.js'
export { SourceDocumentResourceClient } from './resources/sourcedocument.js'
export { ProjectResourceClient } from './resources/project.js'
export { TargetResourceClient } from './resources/target.js'
export { BuildConfigurationResourceClient } from './resources/buildconfiguration.js'
export { BuildSettingResourceClient } from './resources/buildsetting.js'
export { ResolvedBuildSettingResourceClient } from './resources/resolvedbuildsetting.js'
export { SchemeResourceClient } from './resources/scheme.js'
export { RunDestinationResourceClient } from './resources/rundestination.js'
export { DeviceResourceClient } from './resources/device.js'
export { SchemeActionResultResourceClient } from './resources/schemeactionresult.js'
export { BuildErrorResourceClient } from './resources/builderror.js'
export { BuildWarningResourceClient } from './resources/buildwarning.js'
export { AnalyzerIssueResourceClient } from './resources/analyzerissue.js'
export { TestFailureResourceClient } from './resources/testfailure.js'
