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
  type RemoteTransport,
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

/** Canonical failures retained privately while raw RPC preserves the legacy error class. */
const canonicalFailures = new WeakMap<Error, MactsError>()

/** Raw RPC compatibility and canonical typed invocation for this app and credential. */
export class HttpClient {
  readonly #transport: RemoteTransport
  #runtime: ClientRuntime | undefined

  constructor(baseUrl: string, apiKey: string) {
    this.#transport = createRemoteTransport(appContract, { url: baseUrl, token: apiKey })
  }

  /**
   * Bind the actual public facade in the shared reference registry. Standalone
   * resource clients lazily bind an ordinary contract client instead. A copied
   * contract changes only construction; its descriptors and codecs are shared.
   * @internal
   */
  bind(client?: object): void {
    const contract: AppContract<object, OmniPlanResources> = {
      ...appContract,
      bind: (runtime) => {
        this.#runtime = runtime
        return client ?? appContract.bind(runtime)
      },
    }
    createCodecClient(contract, {
      invoke: async (operation, input, options) => {
        try {
          return await this.rpc(operation, input as object, options)
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

  /** Invoke a descriptor with SDK input; generated return types come from that contract and its output codec validates the result. @internal */
  async invoke<T>(
    path: string,
    input: object = {},
    options?: CallOptions,
    expectedResource?: string
  ): Promise<T> {
    const operation = Object.values(appContract.operations).find(
      (candidate) => candidate.id === path
    )
    if (
      operation === undefined ||
      operation.unavailable !== undefined ||
      (expectedResource !== undefined && operation.target.resource !== expectedResource)
    ) {
      throw new ValidationError('The operation is not registered in this app contract.', {
        issues: [{ path: [], message: 'Unknown or mismatched operation route.' }],
      })
    }
    if (this.#runtime === undefined) this.bind()
    if (this.#runtime === undefined) throw new Error('Client runtime was not initialized.')
    return this.#runtime.invoke(operation, input, options) as Promise<T>
  }

  /** Raw wire RPC for explicit passthrough consumers; typed methods use invoke. */
  async rpc<T>(path: string, body: object = {}, options?: CallOptions): Promise<T> {
    // Typed wrappers dispatch through this public hook, including overrides
    // that forward only two arguments. Shared protocol handling needs no hidden
    // request metadata; forwarding options preserves cancellation only.
    const outcome = await this.#transport.requestRpc(
      path as OperationId,
      body as WireValue,
      options
    )
    if (outcome.ok) return outcome.result as T
    const error = outcome.envelope as { error?: { code?: string; message?: string } } | null
    const legacy = new OmniPlanError(
      error?.error?.code ?? 'UNKNOWN_ERROR',
      error?.error?.message ?? `HTTP ${String(outcome.status)}`
    )
    canonicalFailures.set(
      legacy,
      fromWireErrorEnvelope(outcome.envelope, { status: outcome.status })
    )
    throw legacy
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
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface OmniPlanClient extends ClientBrand<OmniPlanResources> {}

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
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
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
