/**
 * Violation client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all violations, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Violation>> {
    return this.#http.invoke<Page<Violation>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Violation'
    )
  }

  /**
   * Fix a violation.
   * macts does not yet send the violation to the app, so the app acts on whatever it chooses.
   */
  async fix(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.fix`,
      {},
      __mactsOptions,
      'Violation'
    )
  }
}
