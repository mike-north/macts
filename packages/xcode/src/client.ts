/**
 * Xcode HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WorkspaceDocumentResourceClient } from './resources/workspacedocument.js'
import { ProjectResourceClient } from './resources/project.js'
import { SchemeResourceClient } from './resources/scheme.js'
import { RunDestinationResourceClient } from './resources/rundestination.js'

/**
 * Client configuration options.
 */
export interface XcodeClientOptions {
  /** API key for authentication */
  apiKey: string
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string
  readonly #apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: { code?: string; message?: string } }
      const code = error.error?.code ?? 'UNKNOWN_ERROR'
      const message = error.error?.message ?? `HTTP ${String(response.status)}`
      throw new XcodeError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for Xcode API errors.
 */
export class XcodeError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'XcodeError'
    this.code = code
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
  readonly #httpClient: HttpClient

  /** A document that represents a workspace on disk. Workspaces are the top-level container for almost all objects and commands in Xcode */
  readonly workspacedocuments: WorkspaceDocumentResourceClient

  /** An Xcode project. Projects represent project files on disk and are always open in the context of a workspace document */
  readonly projects: ProjectResourceClient

  /** A set of parameters for building, testing, launching or distributing the products of a workspace */
  readonly schemes: SchemeResourceClient

  /** An object which specifies parameters such as the device and architecture for which to perform a scheme action */
  readonly rundestinations: RunDestinationResourceClient

  constructor(options: XcodeClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.workspacedocuments = new WorkspaceDocumentResourceClient(
      this.#httpClient,
      'xcode',
      'workspacedocuments'
    )
    this.projects = new ProjectResourceClient(this.#httpClient, 'xcode', 'projects')
    this.schemes = new SchemeResourceClient(this.#httpClient, 'xcode', 'schemes')
    this.rundestinations = new RunDestinationResourceClient(
      this.#httpClient,
      'xcode',
      'rundestinations'
    )
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }
}
