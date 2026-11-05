/**
 * Tab client for iTerm SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Tab } from '../types.js'

/**
 * Client for a terminal tab.
 */
export class TabResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the tabs of one window, as one page.
   */
  async list(windowId: number): Promise<Page<Tab>> {
    return this.#http.rpc<Page<Tab>>(`${this.#app}.${this.#resource}.list`, {
      windowId: { integer: String(windowId) },
    })
  }

  /**
   * Get a tab by index within a parent scope.
   * A tab has no id, so it is selected by its zero-based position within its window, which drifts when tabs open, close or move.
   */
  async get(windowId: string, index: string): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.get`, { windowId, index })
  }
}
