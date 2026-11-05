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
  async list(
    windowId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Tab>> {
    return this.#http.invoke<Page<Tab>>(
      `${this.#app}.${this.#resource}.list`,
      { windowId },
      __mactsOptions
    )
  }

  /**
   * Get a tab by id within a parent scope.
   */
  async get(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Tab> {
    return this.#http.invoke<Tab>(
      `${this.#app}.${this.#resource}.get`,
      { windowId, id },
      __mactsOptions
    )
  }

  /**
   * Create a new tab.
   */
  async create(
    input: TabCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Tab> {
    return this.#http.invoke<Tab>(`${this.#app}.${this.#resource}.create`, input, __mactsOptions)
  }

  /**
   * Reload a tab
   */
  async reload(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.reload`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Go Back (If Possible)
   */
  async goBack(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.goBack`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Go Forward (If Possible)
   */
  async goForward(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.goForward`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Select all
   */
  async selectAll(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.selectAll`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Cut selected text (If Possible)
   */
  async cutSelection(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.cutSelection`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Copy text
   */
  async copySelection(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.copySelection`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Paste text (If Possible)
   */
  async pasteSelection(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.pasteSelection`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Undo the last change
   */
  async undo(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.undo`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Redo the last change
   */
  async redo(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.redo`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Stop the current tab from loading
   */
  async stop(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.stop`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * View the HTML source of the tab
   */
  async viewSource(
    tabId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.viewSource`,
      { tabId },
      __mactsOptions
    )
  }

  /**
   * Execute a piece of javascript
   */
  async execute(
    tabId: string,
    javascript: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.execute`,
      { tabId, javascript },
      __mactsOptions
    )
  }
}
