/**
 * BrowserWindow client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { BrowserWindow } from '../types.js'

/**
 * Client for the main window.
 */
export class BrowserWindowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all browser windows, as one page.
   */
  async list(): Promise<Page<BrowserWindow>> {
    return this.#http.rpc<Page<BrowserWindow>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a browser window by id.
   */
  async get(id: string): Promise<BrowserWindow> {
    return this.#http.rpc<BrowserWindow>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
