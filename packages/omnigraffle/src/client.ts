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
import { omniGraffleContract as appContract } from './contract/index.js'
import {
  createCodecClient,
  createRemoteTransport,
  type ClientTransport,
} from '@macts/contracts/client'
import {
  MactsError,
  OperationCancelledError,
  TransportError,
  ValidationError,
  fromWireErrorEnvelope,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type OperationId,
  type WireValue,
} from '@macts/contracts'
import type { OmniGraffleResources } from './contract/index.js'

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
/** Canonical failures retained privately while raw RPC preserves the legacy error class. */
const canonicalFailures = new WeakMap<Error, MactsError>()

/**
 * Private request metadata selects the canonical POST while retaining the public
 * raw RPC hook. It never enters the request body or caller-owned options.
 */
const canonicalCall = Symbol('canonical contract call')

export class HttpClient {
  readonly #transport: ClientTransport
  readonly #baseUrl: string
  readonly #apiKey: string
  #runtime: ClientRuntime | undefined

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
    this.#transport = createRemoteTransport(appContract, { url: baseUrl, token: apiKey })
  }

  /**
   * Bind the actual public facade in the shared reference registry. A copied
   * contract changes only construction; its descriptors and codecs are shared.
   * @internal
   */
  bind<Client extends ClientBrand<OmniGraffleResources>>(client: Client): void {
    const contract: AppContract<Client, OmniGraffleResources> = {
      ...appContract,
      bind: (runtime) => {
        this.#runtime = runtime
        return client
      },
    }
    createCodecClient(contract, {
      invoke: async (operation, input, options) => {
        try {
          const requestOptions: CallOptions & { readonly [canonicalCall]: true } = {
            ...options,
            [canonicalCall]: true,
          }
          return await this.rpc(operation, input as object, requestOptions)
        } catch (error) {
          if (error instanceof MactsError) throw error
          if (error instanceof Error) {
            const canonical = canonicalFailures.get(error)
            if (canonical !== undefined) throw canonical
          }
          if (options?.signal?.aborted === true)
            throw new OperationCancelledError('The operation was cancelled.', {})
          throw new TransportError('The custom RPC transport failed.', { reason: 'unreachable' })
        }
      },
      resolve: this.#transport.resolve,
    })
  }

  /** Invoke a registered operation with SDK input; raw RPC hooks still see wire input. @internal */
  async invoke<T>(path: string, input: object = {}, options?: CallOptions): Promise<T> {
    const operation = Object.values(appContract.operations).find(
      (candidate) => candidate.id === path
    )
    if (operation === undefined || operation.unavailable !== undefined) {
      throw new ValidationError('The operation is not registered in this app contract.', {
        issues: [{ path: [], message: 'Unknown operation route.' }],
      })
    }
    if (this.#runtime === undefined) this.bind({})
    if (this.#runtime === undefined) throw new Error('Client runtime was not initialized.')
    return this.#runtime.invoke(operation, input, options) as Promise<T>
  }

  /** Raw wire RPC for explicit passthrough consumers; typed methods use invoke. */
  async rpc<T>(path: string, body: object = {}, options?: CallOptions): Promise<T> {
    // Typed wrappers still dispatch through overrides; an override forwarding to
    // super retains the shared transport's envelope/cancellation semantics.
    if (options !== undefined && canonicalCall in options) {
      return (await this.#transport.invoke(path as OperationId, body as WireValue, options)) as T
    }
    const response = await fetch(`${this.#baseUrl}/api/v1/rpc/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    })
    if (!response.ok) {
      const envelope: unknown = await response.json()
      const error = envelope as { error?: { code?: string; message?: string } }
      const legacy = new OmniGraffleError(
        error.error?.code ?? 'UNKNOWN_ERROR',
        error.error?.message ?? `HTTP ${String(response.status)}`
      )
      canonicalFailures.set(legacy, fromWireErrorEnvelope(envelope, { status: response.status }))
      throw legacy
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
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface OmniGraffleClient extends ClientBrand<OmniGraffleResources> {}

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
    this.#httpClient.bind(this)
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
  async connect(
    from: string,
    to: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnigraffle.app.connect',
      { from, to },
      __mactsOptions
    )
  }

  /**
   * Layout graphics using the document's Layout Info
   */
  async layout(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnigraffle.app.layout', {}, __mactsOptions)
  }

  /**
   * Export documents
   */
  async _export(
    as: string,
    scope: ExportAreaType,
    to: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnigraffle.app.export',
      { as, scope, to },
      __mactsOptions
    )
  }

  /**
   * Flip graphics
   */
  async flip(
    over: Orientation,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnigraffle.app.flip', { over }, __mactsOptions)
  }

  /**
   * Slide graphics by a vector amount
   */
  async slide(
    by: { x: number; y: number },
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnigraffle.app.slide', { by }, __mactsOptions)
  }

  /**
   * Group graphics
   */
  async assemble(
    subgraph?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnigraffle.app.assemble',
      { subgraph },
      __mactsOptions
    )
  }

  /**
   * Change the number of pages to fit the current graphics
   */
  async pageAdjust(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnigraffle.app.pageAdjust', {}, __mactsOptions)
  }

  /**
   * Evaluate JavaScript and return the result
   */
  async evaluateJavascript(
    script: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnigraffle.app.evaluateJavascript',
      { script },
      __mactsOptions
    )
  }
}
