/**
 * OmniPlan HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ProjectResourceClient } from './resources/project.js'
import { TaskResourceClient } from './resources/task.js'
import { MilestoneResourceClient } from './resources/milestone.js'
import { ResourceResourceClient } from './resources/resource.js'
import { AssignmentResourceClient } from './resources/assignment.js'
import { DependencyResourceClient } from './resources/dependency.js'
import { ViolationResourceClient } from './resources/violation.js'
import { ScenarioResourceClient } from './resources/scenario.js'

import { omniPlanContract as appContract } from './contract/index.js'
import {
  createCodecClient,
  createRemoteTransport,
  type ClientTransport,
} from '@macts/contracts/client'
import {
  MactsError,
  OperationCancelledError,
  TransportError,
  ValidationError,
  fromWireErrorEnvelope,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type OperationId,
  type WireValue,
} from '@macts/contracts'
import type { OmniPlanResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface OmniPlanClientOptions {
  /** API key for authentication */
  apiKey: string
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
/** Canonical failures retained privately while raw RPC preserves the legacy error class. */
const canonicalFailures = new WeakMap<Error, MactsError>()

/**
 * Private request metadata selects the canonical POST while retaining the public
 * raw RPC hook. It never enters the request body or caller-owned options.
 */
const canonicalCall = Symbol('canonical contract call')

export class HttpClient {
  readonly #transport: ClientTransport
  readonly #baseUrl: string
  readonly #apiKey: string
  #runtime: ClientRuntime | undefined

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
    this.#transport = createRemoteTransport(appContract, { url: baseUrl, token: apiKey })
  }

  /**
   * Bind the actual public facade in the shared reference registry. A copied
   * contract changes only construction; its descriptors and codecs are shared.
   * @internal
   */
  bind<Client extends ClientBrand<OmniPlanResources>>(client: Client): void {
    const contract: AppContract<Client, OmniPlanResources> = {
      ...appContract,
      bind: (runtime) => {
        this.#runtime = runtime
        return client
      },
    }
    createCodecClient(contract, {
      invoke: async (operation, input, options) => {
        try {
          const requestOptions: CallOptions & { readonly [canonicalCall]: true } = {
            ...options,
            [canonicalCall]: true,
          }
          return await this.rpc(operation, input as object, requestOptions)
        } catch (error) {
          if (error instanceof MactsError) throw error
          if (error instanceof Error) {
            const canonical = canonicalFailures.get(error)
            if (canonical !== undefined) throw canonical
          }
          if (options?.signal?.aborted === true)
            throw new OperationCancelledError('The operation was cancelled.', {})
          throw new TransportError('The custom RPC transport failed.', { reason: 'unreachable' })
        }
      },
      resolve: this.#transport.resolve,
    })
  }

  /** Invoke a registered operation with SDK input; raw RPC hooks still see wire input. @internal */
  async invoke<T>(path: string, input: object = {}, options?: CallOptions): Promise<T> {
    const operation = Object.values(appContract.operations).find(
      (candidate) => candidate.id === path
    )
    if (operation === undefined || operation.unavailable !== undefined) {
      throw new ValidationError('The operation is not registered in this app contract.', {
        issues: [{ path: [], message: 'Unknown operation route.' }],
      })
    }
    if (this.#runtime === undefined) this.bind({})
    if (this.#runtime === undefined) throw new Error('Client runtime was not initialized.')
    return this.#runtime.invoke(operation, input, options) as Promise<T>
  }

  /** Raw wire RPC for explicit passthrough consumers; typed methods use invoke. */
  async rpc<T>(path: string, body: object = {}, options?: CallOptions): Promise<T> {
    // Typed wrappers still dispatch through overrides; an override forwarding to
    // super retains the shared transport's envelope/cancellation semantics.
    if (options !== undefined && canonicalCall in options) {
      return (await this.#transport.invoke(path as OperationId, body as WireValue, options)) as T
    }
    const response = await fetch(`${this.#baseUrl}/api/v1/rpc/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    })
    if (!response.ok) {
      const envelope: unknown = await response.json()
      const error = envelope as { error?: { code?: string; message?: string } }
      const legacy = new OmniPlanError(
        error.error?.code ?? 'UNKNOWN_ERROR',
        error.error?.message ?? `HTTP ${String(response.status)}`
      )
      canonicalFailures.set(legacy, fromWireErrorEnvelope(envelope, { status: response.status }))
      throw legacy
    }
    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for OmniPlan API errors.
 */
export class OmniPlanError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'OmniPlanError'
    this.code = code
  }
}

/**
 * OmniPlan client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new OmniPlanClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface OmniPlanClient extends ClientBrand<OmniPlanResources> {}

export class OmniPlanClient {
  readonly #httpClient: HttpClient

  /** An OmniPlan project */
  readonly projects: ProjectResourceClient

  /** A task within an OmniPlan project */
  readonly tasks: TaskResourceClient

  /** A milestone (zero-duration marker task) */
  readonly milestones: MilestoneResourceClient

  /** A resource (person, equipment, or material) */
  readonly resources: ResourceResourceClient

  /** An assignment of a resource to a task */
  readonly assignments: AssignmentResourceClient

  /** A dependency of one task upon another task */
  readonly dependencies: DependencyResourceClient

  /** A scheduling conflict or issue */
  readonly violations: ViolationResourceClient

  /** An alternative project plan */
  readonly scenarios: ScenarioResourceClient

  constructor(options: OmniPlanClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.projects = new ProjectResourceClient(this.#httpClient, 'omniplan', 'projects')
    this.tasks = new TaskResourceClient(this.#httpClient, 'omniplan', 'tasks')
    this.milestones = new MilestoneResourceClient(this.#httpClient, 'omniplan', 'milestones')
    this.resources = new ResourceResourceClient(this.#httpClient, 'omniplan', 'resources')
    this.assignments = new AssignmentResourceClient(this.#httpClient, 'omniplan', 'assignments')
    this.dependencies = new DependencyResourceClient(this.#httpClient, 'omniplan', 'dependencies')
    this.violations = new ViolationResourceClient(this.#httpClient, 'omniplan', 'violations')
    this.scenarios = new ScenarioResourceClient(this.#httpClient, 'omniplan', 'scenarios')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Export a document
   */
  async _export(
    to: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('omniplan.app.export', { to }, __mactsOptions)
  }

  /**
   * Assign resources to tasks
   */
  async assign(
    resource: string,
    task: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omniplan.app.assign',
      { resource, task },
      __mactsOptions
    )
  }

  /**
   * Create a dependency between tasks
   */
  async depend(
    prerequisite: string,
    dependent: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omniplan.app.depend',
      { prerequisite, dependent },
      __mactsOptions
    )
  }

  /**
   * Commit the current schedule as the baseline schedule
   */
  async baseline(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omniplan.app.baseline', {}, __mactsOptions)
  }

  /**
   * Level resources on project
   */
  async level(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omniplan.app.level', {}, __mactsOptions)
  }

  /**
   * Look up a task via a custom data key
   */
  async lookup(
    key: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('omniplan.app.lookup', { key }, __mactsOptions)
  }

  /**
   * Make a change tracking mark on project
   */
  async changeMark(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omniplan.app.changeMark', {}, __mactsOptions)
  }

  /**
   * Add working hours to a schedule
   */
  async addWorkTime(
    schedule: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omniplan.app.addWorkTime',
      { schedule },
      __mactsOptions
    )
  }

  /**
   * Remove working hours from a schedule
   */
  async subtractWorkTime(
    schedule: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omniplan.app.subtractWorkTime',
      { schedule },
      __mactsOptions
    )
  }

  /**
   * Undo the last command
   */
  async undo(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omniplan.app.undo', {}, __mactsOptions)
  }

  /**
   * Redo the last undone command
   */
  async redo(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omniplan.app.redo', {}, __mactsOptions)
  }
}
