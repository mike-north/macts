/**
 * Violation client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Violation } from '../types.js'

/**
 * Client for a scheduling conflict or issue.
 */
export class ViolationResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all violations.
   */
  async list(): Promise<Violation[]> {
    return this.#http.rpc<Violation[]>(`${this.#app}.${this.#resource}.listViolations`)
  }

  /**
   * Fix a violation
   */
  async fix(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.fix`, {})
  }
}
