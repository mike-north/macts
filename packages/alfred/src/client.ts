/**
 * Alfred HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ApplicationResourceClient } from './resources/application.js';


/**
 * Client configuration options.
 */
export interface AlfredClientOptions {
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
      const code = error.error?.code ?? 'UNKNOWN_ERROR';
      const message = error.error?.message ?? `HTTP ${String(response.status)}`;
      throw new AlfredError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Alfred API errors.
 */
export class AlfredError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AlfredError';
    this.code = code;
  }
}

/**
 * Alfred client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new AlfredClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class AlfredClient {
  readonly #httpClient: HttpClient;

  /** The Alfred application */
  readonly applications: ApplicationResourceClient;

  constructor(options: AlfredClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.applications = new ApplicationResourceClient(this.#httpClient, 'alfred', 'applications');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Show Alfred with the given text
   */
  async search(query?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.search', { query });
  }


  /**
   * Show Alfred actions for the given file
   */
  async action(items: string, asType?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.action', { items, asType });
  }


  /**
   * Show Alfred file system navigation for given path
   */
  async browse(path: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.browse', { path });
  }


  /**
   * Run Alfred workflow trigger
   */
  async runTrigger(trigger: string, inWorkflow: string, withArgument?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.runTrigger', { trigger, inWorkflow, withArgument });
  }


  /**
   * Reload Workflow with given UID (folder name) or Bundle ID
   */
  async reloadWorkflow(workflow: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.reloadWorkflow', { workflow });
  }


  /**
   * Reveal Workflow with given UID (folder name) or Bundle ID
   */
  async revealWorkflow(workflow: string, configuration?: boolean, details?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.revealWorkflow', { workflow, configuration, details });
  }


  /**
   * Modify workflow configuration value, or set environment variable
   */
  async setConfiguration(variable: string, toValue: string, inWorkflow: string, exportable?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.setConfiguration', { variable, toValue, inWorkflow, exportable });
  }


  /**
   * Revert workflow configuration value to default, or delete environment variable
   */
  async removeConfiguration(variable: string, inWorkflow: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.removeConfiguration', { variable, inWorkflow });
  }


  /**
   * Change theme in Alfred
   */
  async setTheme(theme: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('alfred.app.setTheme', { theme });
  }
}
