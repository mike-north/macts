/**
 * TestFailure client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { TestFailure, TestFailureCreateInput, TestFailureUpdateInput } from '../types.js';

/**
 * Client for a failure from a test.
 */
export class TestFailureResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all testfailures.
   */
  async list(): Promise<TestFailure[]> {
    return this.#http.rpc<TestFailure[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a testfailure by message.
   */
  async get(message: string): Promise<TestFailure> {
    return this.#http.rpc<TestFailure>(`${this.#app}.${this.#resource}.get`, { message });
  }

  /**
   * Create a new testfailure.
   */
  async create(input: TestFailureCreateInput): Promise<TestFailure> {
    return this.#http.rpc<TestFailure>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing testfailure.
   */
  async update(message: string, input: TestFailureUpdateInput): Promise<TestFailure> {
    return this.#http.rpc<TestFailure>(`${this.#app}.${this.#resource}.update`, { message, ...input });
  }

  /**
   * Delete a testfailure.
   */
  async delete(message: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { message });
  }

}
