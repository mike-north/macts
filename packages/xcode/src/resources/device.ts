/**
 * Device client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Device, DeviceCreateInput, DeviceUpdateInput } from '../types.js';

/**
 * Client for a device which can be used as the target for a scheme action, as part of a run destination.
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
   * Get a device by deviceIdentifier.
   */
  async get(deviceIdentifier: string): Promise<Device> {
    return this.#http.rpc<Device>(`${this.#app}.${this.#resource}.get`, { deviceIdentifier });
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
  async update(deviceIdentifier: string, input: DeviceUpdateInput): Promise<Device> {
    return this.#http.rpc<Device>(`${this.#app}.${this.#resource}.update`, { deviceIdentifier, ...input });
  }

  /**
   * Delete a device.
   */
  async delete(deviceIdentifier: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { deviceIdentifier });
  }

}
