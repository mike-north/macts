/**
 * Tab client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Tab, TabCreateInput, TabUpdateInput } from '../types.js';

/**
 * Client for a tab..
 */
export class TabResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all tabs.
   */
  async list(): Promise<Tab[]> {
    return this.#http.rpc<Tab[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a tab by id.
   */
  async get(id: string): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new tab.
   */
  async create(input: TabCreateInput): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing tab.
   */
  async update(id: string, input: TabUpdateInput): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a tab.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }





  /**
   * Reload a tab
   */
  async reload(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.reload', { tabId });
  }


  /**
   * Go Back (If Possible)
   */
  async goBack(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.goBack', { tabId });
  }


  /**
   * Go Forward (If Possible)
   */
  async goForward(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.goForward', { tabId });
  }


  /**
   * Select all
   */
  async selectAll(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.selectAll', { tabId });
  }


  /**
   * Cut selected text (If Possible)
   */
  async cutSelection(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.cutSelection', { tabId });
  }


  /**
   * Copy text
   */
  async copySelection(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.copySelection', { tabId });
  }


  /**
   * Paste text (If Possible)
   */
  async pasteSelection(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.pasteSelection', { tabId });
  }


  /**
   * Undo the last change
   */
  async undo(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.undo', { tabId });
  }


  /**
   * Redo the last change
   */
  async redo(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.redo', { tabId });
  }


  /**
   * Stop the current tab from loading
   */
  async stop(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.stop', { tabId });
  }


  /**
   * View the HTML source of the tab
   */
  async viewSource(tabId: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.viewSource', { tabId });
  }


  /**
   * Execute a piece of javascript
   */
  async execute(tabId: string, javascript: string): Promise<void> {
    return this.#http.rpc<void>('microsoft-edge.tabs.execute', { tabId, javascript });
  }
}
