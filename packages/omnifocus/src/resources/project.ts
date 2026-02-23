/**
 * Project client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Project, ProjectCreateInput, ProjectUpdateInput } from '../types.js';

/**
 * Client for a project in omnifocus.
 */
export class ProjectResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all projects.
   */
  async list(): Promise<Project[]> {
    return this.#http.rpc<Project[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a project by id.
   */
  async get(id: string): Promise<Project> {
    return this.#http.rpc<Project>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new project.
   */
  async create(input: ProjectCreateInput): Promise<Project> {
    return this.#http.rpc<Project>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing project.
   */
  async update(id: string, input: ProjectUpdateInput): Promise<Project> {
    return this.#http.rpc<Project>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a project.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }



}
