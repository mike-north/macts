/**
 * Tab client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

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
   * List all tabs.
   */
  async list(windowId: string): Promise<Tab[]> {
    return this.#http.rpc<Tab[]>(`${this.#app}.${this.#resource}.listTabs`, { windowId })
  }

  /**
   * Get a tab by id.
   */
  async get(id: string): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.getTab`, { id })
  }

  /**
   * Create a new tab.
   */
  async create(input: TabCreateInput): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.createTab`, input)
  }

  /**
   * Reload a tab
   */
  async reload(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.reload`, { tabId })
  }

  /**
   * Go Back (If Possible)
   */
  async goBack(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.goBack`, { tabId })
  }

  /**
   * Go Forward (If Possible)
   */
  async goForward(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.goForward`, { tabId })
  }

  /**
   * Select all
   */
  async selectAll(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.selectAll`, { tabId })
  }

  /**
   * Cut selected text (If Possible)
   */
  async cutSelection(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.cutSelection`, { tabId })
  }

  /**
   * Copy text
   */
  async copySelection(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.copySelection`, { tabId })
  }

  /**
   * Paste text (If Possible)
   */
  async pasteSelection(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.pasteSelection`, { tabId })
  }

  /**
   * Undo the last change
   */
  async undo(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.undo`, { tabId })
  }

  /**
   * Redo the last change
   */
  async redo(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.redo`, { tabId })
  }

  /**
   * Stop the current tab from loading
   */
  async stop(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.stop`, { tabId })
  }

  /**
   * View the HTML source of the tab
   */
  async viewSource(tabId: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.viewSource`, { tabId })
  }

  /**
   * Execute a piece of javascript
   */
  async execute(tabId: string, javascript: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.execute`, { tabId, javascript })
  }
}
