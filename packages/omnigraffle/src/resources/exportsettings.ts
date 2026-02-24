/**
 * ExportSettings client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  ExportSettings,
  ExportSettingsCreateInput,
  ExportSettingsUpdateInput,
} from '../types.js'

/**
 * Client for export configuration settings.
 */
export class ExportSettingsResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all exportsettings.
   */
  async list(): Promise<ExportSettings[]> {
    return this.#http.rpc<ExportSettings[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a exportsettings by id.
   */
  async get(id: string): Promise<ExportSettings> {
    return this.#http.rpc<ExportSettings>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new exportsettings.
   */
  async create(input: ExportSettingsCreateInput): Promise<ExportSettings> {
    return this.#http.rpc<ExportSettings>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing exportsettings.
   */
  async update(id: string, input: ExportSettingsUpdateInput): Promise<ExportSettings> {
    return this.#http.rpc<ExportSettings>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a exportsettings.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
