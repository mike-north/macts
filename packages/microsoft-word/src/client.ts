/**
 * MicrosoftWord HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { DocumentResourceClient } from './resources/document.js'

import { microsoftWordContract as appContract } from './contract/index.js'
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
import type { MicrosoftWordResources } from './contract/index.js'

import {
  Integer as __mactsInteger,
  ValueTypes as __mactsValueTypes,
  ValidationError as __mactsValidationError,
} from '@macts/contracts'

/** Integer wire policy shared with the operation contracts, built once per module. */
const __mactsIntegerWire = __mactsValueTypes.integer().wire

/** Validate CLI text or an SDK number before dispatch, without implicit rounding. */
function __mactsIntegerInput(value: unknown): __mactsInteger {
  const integer = typeof value === 'number' || typeof value === 'string' ? String(value) : undefined
  const candidate = { integer }
  if (!__mactsIntegerWire.safeParse(candidate).success || integer === undefined) {
    const message =
      'Expected a canonical decimal integer from -9007199254740991 to 9007199254740991.'
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] })
  }
  return __mactsInteger.validate(Number(integer))
}

/**
 * Client configuration options.
 */
export interface MicrosoftWordClientOptions {
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
  bind<Client extends ClientBrand<MicrosoftWordResources>>(client: Client): void {
    const contract: AppContract<Client, MicrosoftWordResources> = {
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
      const legacy = new MicrosoftWordError(
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
 * Error class for MicrosoftWord API errors.
 */
export class MicrosoftWordError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MicrosoftWordError'
    this.code = code
  }
}

/**
 * MicrosoftWord client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new MicrosoftWordClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface MicrosoftWordClient extends ClientBrand<MicrosoftWordResources> {}

export class MicrosoftWordClient {
  readonly #httpClient: HttpClient

  /** A Microsoft Word document */
  readonly documents: DocumentResourceClient

  constructor(options: MicrosoftWordClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.documents = new DocumentResourceClient(this.#httpClient, 'microsoft-word', 'documents')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Undo the last action
   */
  async undo(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('microsoft-word.app.undo', {}, __mactsOptions)
  }

  /**
   * Redo the last undone action
   */
  async redo(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('microsoft-word.app.redo', {}, __mactsOptions)
  }

  /**
   * Copy the selected content to the clipboard
   */
  async copyObject(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('microsoft-word.app.copyObject', {}, __mactsOptions)
  }

  /**
   * Cut the selected content to the clipboard
   */
  async cutObject(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('microsoft-word.app.cutObject', {}, __mactsOptions)
  }

  /**
   * Paste content from the clipboard
   */
  async pasteObject(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('microsoft-word.app.pasteObject', {}, __mactsOptions)
  }

  /**
   * Select all content in the document
   */
  async selectAll(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('microsoft-word.app.selectAll', {}, __mactsOptions)
  }

  /**
   * Find text in the document
   */
  async find(
    findText: string,
    matchCase?: boolean,
    matchWholeWord?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'microsoft-word.app.find',
      { findText, matchCase, matchWholeWord },
      __mactsOptions
    )
  }

  /**
   * Replace text in the document
   */
  async replace(
    findText: string,
    replaceWith: string,
    replaceAll?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'microsoft-word.app.replace',
      { findText, replaceWith, replaceAll },
      __mactsOptions
    )
  }

  /**
   * Insert text at the specified location
   */
  async insertText(
    text: string,
    at?: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'microsoft-word.app.insertText',
      { text, ...(at === undefined ? {} : { at: __mactsIntegerInput(at) }) },
      __mactsOptions
    )
  }

  /**
   * Create a new document
   */
  async createNewDocument(
    attachedTemplate?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'microsoft-word.app.createNewDocument',
      { attachedTemplate },
      __mactsOptions
    )
  }
}
