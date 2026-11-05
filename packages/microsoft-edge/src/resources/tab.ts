/**
 * Tab client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Tab, TabCreateInput } from '../types.js'

/**
 * Client for a tab..
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
  async list(windowId: string): Promise<Page<Tab>> {
    return this.#http.rpc<Page<Tab>>(`${this.#app}.${this.#resource}.list`, { windowId })
  }

  /**
   * Get a tab by id within a parent scope.
   */
  async get(windowId: string, id: string): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.get`, { windowId, id })
  }

  /**
   * Create a new tab.
   */
  async create(input: TabCreateInput): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Reload a tab
   */
  async reload(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.reload`, { windowId, id })
  }

  /**
   * Go Back (If Possible)
   */
  async goBack(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.goBack`, { windowId, id })
  }

  /**
   * Go Forward (If Possible)
   */
  async goForward(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.goForward`, { windowId, id })
  }

  /**
   * Select all
   */
  async selectAll(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.selectAll`, { windowId, id })
  }

  /**
   * Cut selected text (If Possible)
   */
  async cutSelection(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.cutSelection`, { windowId, id })
  }

  /**
   * Copy text
   */
  async copySelection(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.copySelection`, {
      windowId,
      id,
    })
  }

  /**
   * Paste text (If Possible)
   */
  async pasteSelection(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.pasteSelection`, {
      windowId,
      id,
    })
  }

  /**
   * Undo the last change
   */
  async undo(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.undo`, { windowId, id })
  }

  /**
   * Redo the last change
   */
  async redo(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.redo`, { windowId, id })
  }

  /**
   * Stop the current tab from loading
   */
  async stop(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.stop`, { windowId, id })
  }

  /**
   * View the HTML source of the tab
   */
  async viewSource(windowId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.viewSource`, { windowId, id })
  }

  /**
   * Execute a piece of javascript
   */
  async execute(windowId: string, id: string, javascript: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.execute`, {
      windowId,
      id,
      javascript,
    })
  }
}
