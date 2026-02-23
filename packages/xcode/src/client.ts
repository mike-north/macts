/**
 * Xcode HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WorkspaceDocumentResourceClient } from './resources/workspacedocument.js';
import { FileDocumentResourceClient } from './resources/filedocument.js';
import { TextDocumentResourceClient } from './resources/textdocument.js';
import { SourceDocumentResourceClient } from './resources/sourcedocument.js';
import { ProjectResourceClient } from './resources/project.js';
import { TargetResourceClient } from './resources/target.js';
import { BuildConfigurationResourceClient } from './resources/buildconfiguration.js';
import { BuildSettingResourceClient } from './resources/buildsetting.js';
import { ResolvedBuildSettingResourceClient } from './resources/resolvedbuildsetting.js';
import { SchemeResourceClient } from './resources/scheme.js';
import { RunDestinationResourceClient } from './resources/rundestination.js';
import { DeviceResourceClient } from './resources/device.js';
import { SchemeActionResultResourceClient } from './resources/schemeactionresult.js';
import { BuildErrorResourceClient } from './resources/builderror.js';
import { BuildWarningResourceClient } from './resources/buildwarning.js';
import { AnalyzerIssueResourceClient } from './resources/analyzerissue.js';
import { TestFailureResourceClient } from './resources/testfailure.js';


/**
 * Client configuration options.
 */
export interface XcodeClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string;
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl;
    this.#apiKey = apiKey;
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { code?: string; message?: string } };
      const code = error?.error?.code ?? 'UNKNOWN_ERROR';
      const message = error?.error?.message ?? `HTTP ${response.status}`;
      throw new XcodeError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Xcode API errors.
 */
export class XcodeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'XcodeError';
    this.code = code;
  }
}

/**
 * Xcode client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new XcodeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class XcodeClient {
  readonly #httpClient: HttpClient;

  /** A document that represents a workspace on disk. Workspaces are the top-level container for almost all objects and commands in Xcode */
  readonly workspacedocuments: WorkspaceDocumentResourceClient;

  /** A document that represents a file on disk */
  readonly filedocuments: FileDocumentResourceClient;

  /** A document that represents a text file on disk */
  readonly textdocuments: TextDocumentResourceClient;

  /** A document that represents a source file on disk */
  readonly sourcedocuments: SourceDocumentResourceClient;

  /** An Xcode project. Projects represent project files on disk and are always open in the context of a workspace document */
  readonly projects: ProjectResourceClient;

  /** A target is a blueprint for building a product. Targets inherit build settings from their project if not overridden in the target */
  readonly targets: TargetResourceClient;

  /** A set of build settings for a target or project. Each target in a project has the same named build configurations as the project */
  readonly buildconfigurations: BuildConfigurationResourceClient;

  /** A setting that controls how products are built */
  readonly buildsettings: BuildSettingResourceClient;

  /** An object that represents a resolved value for a build setting */
  readonly resolvedbuildsettings: ResolvedBuildSettingResourceClient;

  /** A set of parameters for building, testing, launching or distributing the products of a workspace */
  readonly schemes: SchemeResourceClient;

  /** An object which specifies parameters such as the device and architecture for which to perform a scheme action */
  readonly rundestinations: RunDestinationResourceClient;

  /** A device which can be used as the target for a scheme action, as part of a run destination */
  readonly devices: DeviceResourceClient;

  /** An object describing the result of performing a scheme action command */
  readonly schemeactionresults: SchemeActionResultResourceClient;

  /** An error generated by a build */
  readonly builderrors: BuildErrorResourceClient;

  /** A warning generated by a build */
  readonly buildwarnings: BuildWarningResourceClient;

  /** A warning generated by the static analyzer */
  readonly analyzerissues: AnalyzerIssueResourceClient;

  /** A failure from a test */
  readonly testfailures: TestFailureResourceClient;

  constructor(options: XcodeClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.workspacedocuments = new WorkspaceDocumentResourceClient(this.#httpClient, 'xcode', 'workspacedocuments');
    this.filedocuments = new FileDocumentResourceClient(this.#httpClient, 'xcode', 'filedocuments');
    this.textdocuments = new TextDocumentResourceClient(this.#httpClient, 'xcode', 'textdocuments');
    this.sourcedocuments = new SourceDocumentResourceClient(this.#httpClient, 'xcode', 'sourcedocuments');
    this.projects = new ProjectResourceClient(this.#httpClient, 'xcode', 'projects');
    this.targets = new TargetResourceClient(this.#httpClient, 'xcode', 'targets');
    this.buildconfigurations = new BuildConfigurationResourceClient(this.#httpClient, 'xcode', 'buildconfigurations');
    this.buildsettings = new BuildSettingResourceClient(this.#httpClient, 'xcode', 'buildsettings');
    this.resolvedbuildsettings = new ResolvedBuildSettingResourceClient(this.#httpClient, 'xcode', 'resolvedbuildsettings');
    this.schemes = new SchemeResourceClient(this.#httpClient, 'xcode', 'schemes');
    this.rundestinations = new RunDestinationResourceClient(this.#httpClient, 'xcode', 'rundestinations');
    this.devices = new DeviceResourceClient(this.#httpClient, 'xcode', 'devices');
    this.schemeactionresults = new SchemeActionResultResourceClient(this.#httpClient, 'xcode', 'schemeactionresults');
    this.builderrors = new BuildErrorResourceClient(this.#httpClient, 'xcode', 'builderrors');
    this.buildwarnings = new BuildWarningResourceClient(this.#httpClient, 'xcode', 'buildwarnings');
    this.analyzerissues = new AnalyzerIssueResourceClient(this.#httpClient, 'xcode', 'analyzerissues');
    this.testfailures = new TestFailureResourceClient(this.#httpClient, 'xcode', 'testfailures');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

}
