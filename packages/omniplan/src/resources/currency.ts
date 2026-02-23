/**
 * Currency client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Currency, CurrencyCreateInput, CurrencyUpdateInput } from '../types.js';

/**
 * Client for a locale based currency object.
 */
export class CurrencyResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all currencies.
   */
  async list(): Promise<Currency[]> {
    return this.#http.rpc<Currency[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a currency by id.
   */
  async get(id: string): Promise<Currency> {
    return this.#http.rpc<Currency>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new currency.
   */
  async create(input: CurrencyCreateInput): Promise<Currency> {
    return this.#http.rpc<Currency>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing currency.
   */
  async update(id: string, input: CurrencyUpdateInput): Promise<Currency> {
    return this.#http.rpc<Currency>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a currency.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
