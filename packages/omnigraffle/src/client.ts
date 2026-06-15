/**
 * OmniGraffle HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { CanvasResourceClient } from './resources/canvas.js'
import { GraphicResourceClient } from './resources/graphic.js'
import { ShapeResourceClient } from './resources/shape.js'
import { LineResourceClient } from './resources/line.js'
import { LayerResourceClient } from './resources/layer.js'
import type { ExportAreaType, Orientation } from './types.js'

/**
 * Client configuration options.
 */
export interface OmniGraffleClientOptions {
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
      throw new OmniGraffleError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for OmniGraffle API errors.
 */
export class OmniGraffleError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'OmniGraffleError'
    this.code = code
  }
}

/**
 * OmniGraffle client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new OmniGraffleClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class OmniGraffleClient {
  readonly #httpClient: HttpClient

  /** A drawing page/canvas in OmniGraffle */
  readonly canvases: CanvasResourceClient

  /** Base class for visual elements in OmniGraffle */
  readonly graphics: GraphicResourceClient

  /** A shape graphic in OmniGraffle */
  readonly shapes: ShapeResourceClient

  /** A line/connector in OmniGraffle */
  readonly lines: LineResourceClient

  /** A drawing layer in OmniGraffle */
  readonly layers: LayerResourceClient

  constructor(options: OmniGraffleClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.canvases = new CanvasResourceClient(this.#httpClient, 'omnigraffle', 'canvases')
    this.graphics = new GraphicResourceClient(this.#httpClient, 'omnigraffle', 'graphics')
    this.shapes = new ShapeResourceClient(this.#httpClient, 'omnigraffle', 'shapes')
    this.lines = new LineResourceClient(this.#httpClient, 'omnigraffle', 'lines')
    this.layers = new LayerResourceClient(this.#httpClient, 'omnigraffle', 'layers')
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Draw a line between graphics
   */
  async connect(from: string, to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omnigraffle.app.connect', { from, to })
  }

  /**
   * Layout graphics using the document's Layout Info
   */
  async layout(): Promise<void> {
    await this.#httpClient.rpc<undefined>('omnigraffle.app.layout', {})
  }

  /**
   * Export documents
   */
  async _export(as: string, scope: ExportAreaType, to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omnigraffle.app.export', { as, scope, to })
  }

  /**
   * Flip graphics
   */
  async flip(over: Orientation): Promise<void> {
    await this.#httpClient.rpc<undefined>('omnigraffle.app.flip', { over })
  }

  /**
   * Slide graphics by a vector amount
   */
  async slide(by: { x: number; y: number }): Promise<void> {
    await this.#httpClient.rpc<undefined>('omnigraffle.app.slide', { by })
  }

  /**
   * Group graphics
   */
  async assemble(subgraph?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('omnigraffle.app.assemble', { subgraph })
  }

  /**
   * Change the number of pages to fit the current graphics
   */
  async pageAdjust(): Promise<void> {
    await this.#httpClient.rpc<undefined>('omnigraffle.app.pageAdjust', {})
  }

  /**
   * Evaluate JavaScript and return the result
   */
  async evaluateJavascript(script: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omnigraffle.app.evaluateJavascript', { script })
  }
}
