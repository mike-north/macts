/**
 * SystemEvents HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { DiskItemResourceClient } from './resources/diskitem.js'
import { ActionResourceClient } from './resources/action.js'
import { UIElementResourceClient } from './resources/uielement.js'

/**
 * Client configuration options.
 */
export interface SystemEventsClientOptions {
  /** API key for authentication */
  apiKey: string
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string
  readonly #apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: { code?: string; message?: string } }
      const code = error.error?.code ?? 'UNKNOWN_ERROR'
      const message = error.error?.message ?? `HTTP ${String(response.status)}`
      throw new SystemEventsError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for SystemEvents API errors.
 */
export class SystemEventsError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SystemEventsError'
    this.code = code
  }
}

/**
 * SystemEvents client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new SystemEventsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class SystemEventsClient {
  readonly #httpClient: HttpClient

  /** An item stored in the file system */
  readonly diskitems: DiskItemResourceClient

  /** An action that can be performed on the UI element */
  readonly actions: ActionResourceClient

  /** A piece of the user interface of a process */
  readonly uielements: UIElementResourceClient

  constructor(options: SystemEventsClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.diskitems = new DiskItemResourceClient(this.#httpClient, 'system-events', 'diskitems')
    this.actions = new ActionResourceClient(this.#httpClient, 'system-events', 'actions')
    this.uielements = new UIElementResourceClient(this.#httpClient, 'system-events', 'uielements')
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Discard the results of a bounded update session with one or more files.
   */
  async abortTransaction(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.abortTransaction', {})
  }

  /**
   * Begin a bounded update session with one or more files.
   */
  async beginTransaction(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.beginTransaction', {})
  }

  /**
   * Apply the results of a bounded update session with one or more files.
   */
  async endTransaction(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.endTransaction', {})
  }

  /**
   * connect a configuration or service
   */
  async connect(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.connect', {})
  }

  /**
   * disconnect a configuration or service
   */
  async disconnect(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.disconnect', {})
  }

  /**
   * start the screen saver
   */
  async start(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.start', {})
  }

  /**
   * stop the screen saver
   */
  async stop(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.stop', {})
  }

  /**
   * Move disk item(s) to a new location.
   */
  async move(to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.move', { to })
  }

  /**
   * Open disk item(s) with the appropriate application.
   */
  async open(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.open', {})
  }

  /**
   * Log out the current user
   */
  async logOut(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.logOut', {})
  }

  /**
   * Restart the computer
   */
  async restart(stateSavingPreference?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.restart', { stateSavingPreference })
  }

  /**
   * Shut Down the computer
   */
  async shutDown(stateSavingPreference?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.shutDown', { stateSavingPreference })
  }

  /**
   * Put the computer to sleep
   */
  async sleep(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.sleep', {})
  }

  /**
   * cause the target process to behave as if key codes were entered
   */
  async keyCode(using?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.keyCode', { using })
  }

  /**
   * cause the target process to behave as if keystrokes were entered
   */
  async keystroke(using?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.keystroke', { using })
  }

  /**
   * Attach an action to a folder
   */
  async attachActionTo(using: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.attachActionTo', { using })
  }

  /**
   * List the actions attached to a folder
   */
  async attachedScripts(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.attachedScripts', {})
  }

  /**
   * cause the target process to behave as if the UI element were cancelled
   */
  async cancel(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.cancel', {})
  }

  /**
   * cause the target process to behave as if the UI element were confirmed
   */
  async confirm(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.confirm', {})
  }

  /**
   * cause the target process to behave as if the UI element were decremented
   */
  async decrement(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.decrement', {})
  }

  /**
   * Send a folder action code to a folder action script
   */
  async doFolderAction(
    folderActionCode: string,
    withItemList?: unknown,
    withWindowSize?: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.doFolderAction', {
      folderActionCode,
      withItemList,
      withWindowSize,
    })
  }

  /**
   * Edit an action of a folder
   */
  async editActionOf(usingActionName?: string, usingActionNumber?: number): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.editActionOf', {
      usingActionName,
      usingActionNumber,
    })
  }

  /**
   * cause the target process to behave as if the UI element were incremented
   */
  async increment(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.increment', {})
  }

  /**
   * cause the target process to behave as if keys were held down
   */
  async keyDown(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.keyDown', {})
  }

  /**
   * cause the target process to behave as if keys were released
   */
  async keyUp(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.keyUp', {})
  }

  /**
   * cause the target process to behave as if the UI element were picked
   */
  async pick(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.pick', {})
  }

  /**
   * Remove a folder action from a folder
   */
  async removeActionFrom(usingActionName?: string, usingActionNumber?: number): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.removeActionFrom', {
      usingActionName,
      usingActionNumber,
    })
  }
}
