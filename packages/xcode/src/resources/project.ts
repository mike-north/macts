/**
 * Project client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Project, ProjectCreateInput, ProjectUpdateInput } from '../types.js';

/**
 * Client for an xcode project. projects represent project files on disk and are always open in the context of a workspace document.
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
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
