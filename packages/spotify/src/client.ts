/**
 * Spotify HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { TrackResourceClient } from './resources/track.js';


/**
 * Client configuration options.
 */
export interface SpotifyClientOptions {
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
      throw new SpotifyError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Spotify API errors.
 */
export class SpotifyError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SpotifyError';
    this.code = code;
  }
}

/**
 * Spotify client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new SpotifyClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class SpotifyClient {
  readonly #httpClient: HttpClient;

  /** The currently playing track */
  readonly tracks: TrackResourceClient;

  constructor(options: SpotifyClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.tracks = new TrackResourceClient(this.#httpClient, 'spotify', 'tracks');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Skip to the next track.
   */
  async nextTrack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('spotify.app.nextTrack', {});
  }


  /**
   * Skip to the previous track.
   */
  async previousTrack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('spotify.app.previousTrack', {});
  }


  /**
   * Toggle play/pause.
   */
  async playpause(): Promise<void> {
    await this.#httpClient.rpc<undefined>('spotify.app.playpause', {});
  }


  /**
   * Pause playback.
   */
  async pause(): Promise<void> {
    await this.#httpClient.rpc<undefined>('spotify.app.pause', {});
  }


  /**
   * Resume playback.
   */
  async play(): Promise<void> {
    await this.#httpClient.rpc<undefined>('spotify.app.play', {});
  }


  /**
   * Start playback of a track in the given context.
   */
  async playTrack(inContext?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('spotify.app.playTrack', { inContext });
  }
}
