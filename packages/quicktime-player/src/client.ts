/**
 * QuickTimePlayer HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { DocumentResourceClient } from './resources/document.js';


/**
 * Client configuration options.
 */
export interface QuickTimePlayerClientOptions {
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
      throw new QuickTimePlayerError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for QuickTimePlayer API errors.
 */
export class QuickTimePlayerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'QuickTimePlayerError';
    this.code = code;
  }
}

/**
 * QuickTimePlayer client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new QuickTimePlayerClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class QuickTimePlayerClient {
  readonly #httpClient: HttpClient;

  /** A QuickTime Player document */
  readonly documents: DocumentResourceClient;

  constructor(options: QuickTimePlayerClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.documents = new DocumentResourceClient(this.#httpClient, 'quicktime-player', 'documents');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Open a URL.
   */
  async openURL(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.openURL', {});
  }


  /**
   * Play the movie.
   */
  async play(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.play', {});
  }


  /**
   * Start the movie recording.
   */
  async start(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.start', {});
  }


  /**
   * Pause the recording.
   */
  async pause(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.pause', {});
  }


  /**
   * Resume the recording.
   */
  async resume(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.resume', {});
  }


  /**
   * Stop the movie or recording.
   */
  async stop(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.stop', {});
  }


  /**
   * Step the movie backward the specified number of steps (default is 1).
   */
  async stepBackward(by?: number): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.stepBackward', { by });
  }


  /**
   * Step the movie forward the specified number of steps (default is 1).
   */
  async stepForward(by?: number): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.stepForward', { by });
  }


  /**
   * Trim the movie.
   */
  async trim(from: number, to: number): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.trim', { from, to });
  }


  /**
   * Present the document full screen.
   */
  async present(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.present', {});
  }


  /**
   * Create a new movie recording document.
   */
  async newMovieRecording(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.newMovieRecording', {});
  }


  /**
   * Create a new audio recording document.
   */
  async newAudioRecording(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.newAudioRecording', {});
  }


  /**
   * Create a new screen recording document.
   */
  async newScreenRecording(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.newScreenRecording', {});
  }


  /**
   * Export a movie to another file
   */
  async _export(_in: string, usingSettingsPreset: string): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.export', { 'in': _in, usingSettingsPreset });
  }


  /**
   * Show the document's Remote HUD
   */
  async showRemoteHud(): Promise<void> {
    return this.#httpClient.rpc<void>('quicktime-player.app.showRemoteHud', {});
  }
}
