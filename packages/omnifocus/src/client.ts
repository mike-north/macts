/**
 * OmniFocus HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { TaskResourceClient } from './resources/task.js';
import { ProjectResourceClient } from './resources/project.js';
import { FolderResourceClient } from './resources/folder.js';
import { TagResourceClient } from './resources/tag.js';
import { InboxTaskResourceClient } from './resources/inboxtask.js';
import { PerspectiveResourceClient } from './resources/perspective.js';


/**
 * Client configuration options.
 */
export interface OmniFocusClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string;
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl;
    this.#apiKey = apiKey;
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { code?: string; message?: string } };
      const code = error?.error?.code ?? 'UNKNOWN_ERROR';
      const message = error?.error?.message ?? `HTTP ${response.status}`;
      throw new OmniFocusError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for OmniFocus API errors.
 */
export class OmniFocusError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'OmniFocusError';
    this.code = code;
  }
}

/**
 * OmniFocus client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new OmniFocusClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class OmniFocusClient {
  readonly #httpClient: HttpClient;

  /** A task within OmniFocus */
  readonly tasks: TaskResourceClient;

  /** A project in OmniFocus */
  readonly projects: ProjectResourceClient;

  /** A group of projects and sub-folders representing an area of responsibility */
  readonly folders: FolderResourceClient;

  /** A tag for organizing and filtering tasks */
  readonly tags: TagResourceClient;

  /** A task that is in the document's inbox */
  readonly inboxtasks: InboxTaskResourceClient;

  /** A saved view or filter configuration */
  readonly perspectives: PerspectiveResourceClient;

  constructor(options: OmniFocusClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.tasks = new TaskResourceClient(this.#httpClient, 'omnifocus', 'tasks');
    this.projects = new ProjectResourceClient(this.#httpClient, 'omnifocus', 'projects');
    this.folders = new FolderResourceClient(this.#httpClient, 'omnifocus', 'folders');
    this.tags = new TagResourceClient(this.#httpClient, 'omnifocus', 'tags');
    this.inboxtasks = new InboxTaskResourceClient(this.#httpClient, 'omnifocus', 'inboxtasks');
    this.perspectives = new PerspectiveResourceClient(this.#httpClient, 'omnifocus', 'perspectives');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Generate a list of completions given a string
   */
  async complete(text: string): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.complete', { text });
  }


  /**
   * Mark one or more projects or tasks complete
   */
  async markComplete(targets: string): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.markComplete', { targets });
  }


  /**
   * Mark one or more projects or tasks incomplete
   */
  async markIncomplete(targets: string): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.markIncomplete', { targets });
  }


  /**
   * Mark one or more projects or tasks as dropped
   */
  async markDropped(targets: string): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.markDropped', { targets });
  }


  /**
   * Converts a textual representation of tasks into tasks
   */
  async parseTasksInto(text: string, into: string): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.parseTasksInto', { text, into });
  }


  /**
   * Write a backup archive of the document
   */
  async archive(_in: string, compression?: boolean): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.archive', { 'in': _in, compression });
  }


  /**
   * Hides completed tasks and processes any inbox items
   */
  async compact(): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.compact', {});
  }


  /**
   * Synchronizes with the shared OmniFocus sync database
   */
  async synchronize(): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.synchronize', {});
  }


  /**
   * Imports a file into an existing OmniFocus document
   */
  async importInto(file: string): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.importInto', { file });
  }


  /**
   * Undo the last command
   */
  async undo(): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.undo', {});
  }


  /**
   * Redo the last undone command
   */
  async redo(): Promise<void> {
    return this.#httpClient.rpc<void>('omnifocus.app.redo', {});
  }
}
