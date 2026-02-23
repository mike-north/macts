/**
 * Device client for Console SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Device, DeviceCreateInput, DeviceUpdateInput } from '../types.js';

/**
 * Client for a device in console.
 */
export class DeviceResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all devices.
   */
  async list(): Promise<Device[]> {
    return this.#http.rpc<Device[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a device by id.
   */
  async get(id: string): Promise<Device> {
    return this.#http.rpc<Device>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new device.
   */
  async create(input: DeviceCreateInput): Promise<Device> {
    return this.#http.rpc<Device>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing device.
   */
  async update(id: string, input: DeviceUpdateInput): Promise<Device> {
    return this.#http.rpc<Device>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a device.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
