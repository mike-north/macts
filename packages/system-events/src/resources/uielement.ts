/**
 * UIElement client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { UIElement, UIElementCreateInput, UIElementUpdateInput } from '../types.js';

/**
 * Client for a piece of the user interface of a process.
 */
export class UIElementResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all uielements.
   */
  async list(): Promise<UIElement[]> {
    return this.#http.rpc<UIElement[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a uielement by id.
   */
  async get(id: string): Promise<UIElement> {
    return this.#http.rpc<UIElement>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new uielement.
   */
  async create(input: UIElementCreateInput): Promise<UIElement> {
    return this.#http.rpc<UIElement>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing uielement.
   */
  async update(id: string, input: UIElementUpdateInput): Promise<UIElement> {
    return this.#http.rpc<UIElement>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a uielement.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }


  /**
   * cause the target process to behave as if the UI element were clicked
   */
  async click(at?: string): Promise<void> {
    return this.#http.rpc<void>('system-events.uielements.click', { at });
  }


  /**
   * set the selected property of the UI element
   */
  async select(): Promise<void> {
    return this.#http.rpc<void>('system-events.uielements.select', {});
  }
}
