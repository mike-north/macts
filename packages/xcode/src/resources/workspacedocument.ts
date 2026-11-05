/**
 * WorkspaceDocument client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { WorkspaceDocument } from '../types.js'

import {
  Integer as __mactsInteger,
  ValueTypes as __mactsValueTypes,
  ValidationError as __mactsValidationError,
} from '@macts/contracts'

/** Integer wire policy shared with the operation contracts, built once per module. */
const __mactsIntegerWire = __mactsValueTypes.integer().wire

/** Validate CLI text or an SDK number before dispatch, without implicit rounding. */
function __mactsIntegerInput(value: unknown): __mactsInteger {
  const integer = typeof value === 'number' || typeof value === 'string' ? String(value) : undefined
  const candidate = { integer }
  if (!__mactsIntegerWire.safeParse(candidate).success || integer === undefined) {
    const message =
      'Expected a canonical decimal integer from -9007199254740991 to 9007199254740991.'
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] })
  }
  return __mactsInteger.validate(Number(integer))
}

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
  async list(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<WorkspaceDocument>> {
    return this.#http.invoke<Page<WorkspaceDocument>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Get a workspace document by name.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<WorkspaceDocument> {
    return this.#http.invoke<WorkspaceDocument>(
      `${this.#app}.${this.#resource}.get`,
      { name },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Invoke the "build" scheme action
   */
  async build(
    workspaceName: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.build`,
      { workspaceName },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Invoke the "clean" scheme action
   */
  async clean(
    workspaceName: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.clean`,
      { workspaceName },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Stop the active scheme action, if one is running
   */
  async stop(
    workspaceName: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.stop`,
      { workspaceName },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Invoke the "run" scheme action
   */
  async run(
    workspaceName: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.run`,
      { workspaceName, withCommandLineArguments, withEnvironmentVariables },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Invoke the "test" scheme action
   */
  async test(
    workspaceName: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.test`,
      { workspaceName, withCommandLineArguments, withEnvironmentVariables },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Start a new debugging session in the workspace
   */
  async attach(
    workspaceName: string,
    toProcessIdentifier: number,
    suspended: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.attach`,
      { workspaceName, toProcessIdentifier: __mactsIntegerInput(toProcessIdentifier), suspended },
      __mactsOptions,
      'WorkspaceDocument'
    )
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
    environmentVariables?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.debug`,
      {
        workspaceName,
        scheme,
        runDestinationSpecifier,
        skipBuilding,
        commandLineArguments,
        environmentVariables,
      },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }
}
