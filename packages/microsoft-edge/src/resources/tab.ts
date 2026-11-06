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
      __mactsOptions,
      'Tab'
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
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Create a new tab.
   */
  async create(
    input: TabCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Tab> {
    return this.#http.invoke<Tab>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Reload a tab
   */
  async reload(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.reload`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Go Back (If Possible)
   */
  async goBack(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.goBack`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Go Forward (If Possible)
   */
  async goForward(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.goForward`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Select all
   */
  async selectAll(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.selectAll`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Cut selected text (If Possible)
   */
  async cutSelection(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.cutSelection`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Copy text
   */
  async copySelection(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.copySelection`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Paste text (If Possible)
   */
  async pasteSelection(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.pasteSelection`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Undo the last change
   */
  async undo(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.undo`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Redo the last change
   */
  async redo(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.redo`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Stop the current tab from loading
   */
  async stop(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.stop`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * View the HTML source of the tab
   */
  async viewSource(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.viewSource`,
      { windowId, id },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Execute a piece of javascript
   */
  async execute(
    windowId: string,
    id: string,
    javascript: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.execute`,
      { windowId, id, javascript },
      __mactsOptions,
      'Tab'
    )
  }
}
