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
   * Invoke the "build" scheme action.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async build(
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.build`,
      { name },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Invoke the "clean" scheme action.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async clean(
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.clean`,
      { name },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Stop the active scheme action, if one is running.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async stop(name: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.stop`,
      { name },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Invoke the "run" scheme action.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async run(
    name: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.run`,
      { name, withCommandLineArguments, withEnvironmentVariables },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Invoke the "test" scheme action.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async test(
    name: string,
    withCommandLineArguments?: unknown,
    withEnvironmentVariables?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.test`,
      { name, withCommandLineArguments, withEnvironmentVariables },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Start a new debugging session in the workspace.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async attach(
    name: string,
    toProcessIdentifier: number,
    suspended: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.attach`,
      { name, toProcessIdentifier: __mactsIntegerInput(toProcessIdentifier), suspended },
      __mactsOptions,
      'WorkspaceDocument'
    )
  }

  /**
   * Start a debugging session using the "run" or "run without building" scheme action.
   * When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async debug(
    name: string,
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
        name,
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
