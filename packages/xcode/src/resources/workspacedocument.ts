/**
 * WorkspaceDocument client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { WorkspaceDocument } from '../types.js'

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
   * List all workspace documents, as one page.
   */
  async list(): Promise<Page<WorkspaceDocument>> {
    return this.#http.rpc<Page<WorkspaceDocument>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a workspace document by name.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(name: string): Promise<WorkspaceDocument> {
    return this.#http.rpc<WorkspaceDocument>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Invoke the "build" scheme action
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async build(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.build`, { name })
  }

  /**
   * Invoke the "clean" scheme action
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async clean(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.clean`, { name })
  }

  /**
   * Stop the active scheme action, if one is running
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async stop(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.stop`, { name })
  }

  /**
   * Invoke the "run" scheme action
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async run(
    name: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown
  ): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.run`, {
      name,
      withCommandLineArguments,
      withEnvironmentVariables,
    })
  }

  /**
   * Invoke the "test" scheme action
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async test(
    name: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown
  ): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.test`, {
      name,
      withCommandLineArguments,
      withEnvironmentVariables,
    })
  }

  /**
   * Start a new debugging session in the workspace
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async attach(name: string, toProcessIdentifier: number, suspended: boolean): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.attach`, {
      name,
      toProcessIdentifier,
      suspended,
    })
  }

  /**
   * Start a debugging session using the "run" or "run without building" scheme action
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async debug(
    name: string,
    scheme?: string,
    runDestinationSpecifier?: string,
    skipBuilding?: boolean,
    commandLineArguments?: unknown,
    environmentVariables?: unknown
  ): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.debug`, {
      name,
      scheme,
      runDestinationSpecifier,
      skipBuilding,
      commandLineArguments,
      environmentVariables,
    })
  }
}
