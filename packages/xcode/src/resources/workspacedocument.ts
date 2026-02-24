/**
 * WorkspaceDocument client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  WorkspaceDocument,
  WorkspaceDocumentCreateInput,
  WorkspaceDocumentUpdateInput,
} from '../types.js'

/**
 * Client for a document that represents a workspace on disk. workspaces are the top-level container for almost all objects and commands in xcode.
 */
export class WorkspaceDocumentResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all workspacedocuments.
   */
  async list(): Promise<WorkspaceDocument[]> {
    return this.#http.rpc<WorkspaceDocument[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a workspacedocument by name.
   */
  async get(name: string): Promise<WorkspaceDocument> {
    return this.#http.rpc<WorkspaceDocument>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Create a new workspacedocument.
   */
  async create(input: WorkspaceDocumentCreateInput): Promise<WorkspaceDocument> {
    return this.#http.rpc<WorkspaceDocument>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing workspacedocument.
   */
  async update(name: string, input: WorkspaceDocumentUpdateInput): Promise<WorkspaceDocument> {
    return this.#http.rpc<WorkspaceDocument>(`${this.#app}.${this.#resource}.update`, {
      name,
      ...input,
    })
  }

  /**
   * Delete a workspacedocument.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name })
  }

  /**
   * Invoke the "build" scheme action
   */
  async build(workspaceName: string): Promise<void> {
    await this.#http.rpc<undefined>('xcode.workspacedocuments.build', { workspaceName })
  }

  /**
   * Invoke the "clean" scheme action
   */
  async clean(workspaceName: string): Promise<void> {
    await this.#http.rpc<undefined>('xcode.workspacedocuments.clean', { workspaceName })
  }

  /**
   * Stop the active scheme action, if one is running
   */
  async stop(workspaceName: string): Promise<void> {
    await this.#http.rpc<undefined>('xcode.workspacedocuments.stop', { workspaceName })
  }

  /**
   * Invoke the "run" scheme action
   */
  async run(
    workspaceName: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown
  ): Promise<void> {
    await this.#http.rpc<undefined>('xcode.workspacedocuments.run', {
      workspaceName,
      withCommandLineArguments,
      withEnvironmentVariables,
    })
  }

  /**
   * Invoke the "test" scheme action
   */
  async test(
    workspaceName: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown
  ): Promise<void> {
    await this.#http.rpc<undefined>('xcode.workspacedocuments.test', {
      workspaceName,
      withCommandLineArguments,
      withEnvironmentVariables,
    })
  }

  /**
   * Start a new debugging session in the workspace
   */
  async attach(
    workspaceName: string,
    toProcessIdentifier: number,
    suspended: boolean
  ): Promise<void> {
    await this.#http.rpc<undefined>('xcode.workspacedocuments.attach', {
      workspaceName,
      toProcessIdentifier,
      suspended,
    })
  }

  /**
   * Start a debugging session using the "run" or "run without building" scheme action
   */
  async debug(
    workspaceName: string,
    scheme?: string,
    runDestinationSpecifier?: string,
    skipBuilding?: boolean,
    commandLineArguments?: unknown,
    environmentVariables?: unknown
  ): Promise<void> {
    await this.#http.rpc<undefined>('xcode.workspacedocuments.debug', {
      workspaceName,
      scheme,
      runDestinationSpecifier,
      skipBuilding,
      commandLineArguments,
      environmentVariables,
    })
  }
}
