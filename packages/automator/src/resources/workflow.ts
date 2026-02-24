/**
 * Workflow client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Workflow, WorkflowCreateInput, WorkflowUpdateInput } from '../types.js'

/**
 * Client for a series of actions stored in a file.
 */
export class WorkflowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all workflows.
   */
  async list(): Promise<Workflow[]> {
    return this.#http.rpc<Workflow[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a workflow by name.
   */
  async get(name: string): Promise<Workflow> {
    return this.#http.rpc<Workflow>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Create a new workflow.
   */
  async create(input: WorkflowCreateInput): Promise<Workflow> {
    return this.#http.rpc<Workflow>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing workflow.
   */
  async update(name: string, input: WorkflowUpdateInput): Promise<Workflow> {
    return this.#http.rpc<Workflow>(`${this.#app}.${this.#resource}.update`, { name, ...input })
  }

  /**
   * Delete a workflow.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name })
  }

  /**
   * Execute a workflow
   */
  async execute(workflow: unknown): Promise<void> {
    await this.#http.rpc<undefined>('automator.workflows.execute', { workflow })
  }
}
