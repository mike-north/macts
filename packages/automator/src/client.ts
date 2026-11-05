/**
 * Automator HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WorkflowResourceClient } from './resources/workflow.js'
import { AutomatorActionResourceClient } from './resources/automatoraction.js'
import { VariableResourceClient } from './resources/variable.js'
import { SettingResourceClient } from './resources/setting.js'
import { RequiredResourceResourceClient } from './resources/requiredresource.js'

import {
  ValueTypes as __mactsValueTypes,
  ValidationError as __mactsValidationError,
} from '@macts/contracts'

/** Integer wire policy shared with the operation contracts, built once per module. */
const __mactsIntegerWire = __mactsValueTypes.integer().wire

/** Validate CLI text or an SDK number before dispatch, without implicit rounding. */
function __mactsIntegerInput(value: unknown): { integer: string } {
  const integer = typeof value === 'number' || typeof value === 'string' ? String(value) : undefined
  const candidate = { integer }
  if (!__mactsIntegerWire.safeParse(candidate).success || integer === undefined) {
    const message =
      'Expected a canonical decimal integer from -9007199254740991 to 9007199254740991.'
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] })
  }
  return { integer }
}

/**
 * Client configuration options.
 */
export interface AutomatorClientOptions {
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
      throw new AutomatorError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for Automator API errors.
 */
export class AutomatorError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AutomatorError'
    this.code = code
  }
}

/**
 * Automator client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new AutomatorClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class AutomatorClient {
  readonly #httpClient: HttpClient

  /** A series of actions stored in a file */
  readonly workflows: WorkflowResourceClient

  /** A single step in a workflow */
  readonly automatorActions: AutomatorActionResourceClient

  /** A variable used by the workflow */
  readonly variables: VariableResourceClient

  /** A named value in an action */
  readonly settings: SettingResourceClient

  /** A resource required for proper operation of the action */
  readonly requiredResources: RequiredResourceResourceClient

  constructor(options: AutomatorClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.workflows = new WorkflowResourceClient(this.#httpClient, 'automator', 'workflows')
    this.automatorActions = new AutomatorActionResourceClient(
      this.#httpClient,
      'automator',
      'automatorActions'
    )
    this.variables = new VariableResourceClient(this.#httpClient, 'automator', 'variables')
    this.settings = new SettingResourceClient(this.#httpClient, 'automator', 'settings')
    this.requiredResources = new RequiredResourceResourceClient(
      this.#httpClient,
      'automator',
      'requiredResources'
    )
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Add an Automator action or variable to a workflow
   */
  async add(object: unknown, to: unknown, atIndex?: number): Promise<void> {
    await this.#httpClient.rpc<undefined>('automator.app.add', {
      object,
      to,
      ...(atIndex === undefined ? {} : { atIndex: __mactsIntegerInput(atIndex) }),
    })
  }

  /**
   * Remove an Automator action or variable from a workflow
   */
  async remove(object: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('automator.app.remove', { object })
  }
}
