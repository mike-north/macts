/**
 * MicrosoftWord HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { DocumentResourceClient } from './resources/document.js'
import { ParagraphResourceClient } from './resources/paragraph.js'
import { TextRangeResourceClient } from './resources/textrange.js'
import { SelectionResourceClient } from './resources/selection.js'
import { TableResourceClient } from './resources/table.js'
import { RowResourceClient } from './resources/row.js'
import { ColumnResourceClient } from './resources/column.js'
import { CellResourceClient } from './resources/cell.js'
import { FontResourceClient } from './resources/font.js'
import { PageSetupResourceClient } from './resources/pagesetup.js'
import { SectionResourceClient } from './resources/section.js'
import { BookmarkResourceClient } from './resources/bookmark.js'
import { FieldResourceClient } from './resources/field.js'

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
      throw new MicrosoftWordError(code, message)
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
export class MicrosoftWordClient {
  readonly #httpClient: HttpClient

  /** A Microsoft Word document */
  readonly documents: DocumentResourceClient

  /** A single paragraph in a document */
  readonly paragraphs: ParagraphResourceClient

  /** A contiguous area in a document */
  readonly textranges: TextRangeResourceClient

  /** The current selection in a document */
  readonly selections: SelectionResourceClient

  /** A table in a document */
  readonly tables: TableResourceClient

  /** A row in a table */
  readonly rows: RowResourceClient

  /** A column in a table */
  readonly columns: ColumnResourceClient

  /** A cell in a table */
  readonly cells: CellResourceClient

  /** Font formatting properties */
  readonly fonts: FontResourceClient

  /** Page setup properties for a document or section */
  readonly pagesetups: PageSetupResourceClient

  /** A section in a document */
  readonly sections: SectionResourceClient

  /** A bookmark in a document */
  readonly bookmarks: BookmarkResourceClient

  /** A field in a document */
  readonly fields: FieldResourceClient

  constructor(options: MicrosoftWordClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.documents = new DocumentResourceClient(this.#httpClient, 'microsoft-word', 'documents')
    this.paragraphs = new ParagraphResourceClient(this.#httpClient, 'microsoft-word', 'paragraphs')
    this.textranges = new TextRangeResourceClient(this.#httpClient, 'microsoft-word', 'textranges')
    this.selections = new SelectionResourceClient(this.#httpClient, 'microsoft-word', 'selections')
    this.tables = new TableResourceClient(this.#httpClient, 'microsoft-word', 'tables')
    this.rows = new RowResourceClient(this.#httpClient, 'microsoft-word', 'rows')
    this.columns = new ColumnResourceClient(this.#httpClient, 'microsoft-word', 'columns')
    this.cells = new CellResourceClient(this.#httpClient, 'microsoft-word', 'cells')
    this.fonts = new FontResourceClient(this.#httpClient, 'microsoft-word', 'fonts')
    this.pagesetups = new PageSetupResourceClient(this.#httpClient, 'microsoft-word', 'pagesetups')
    this.sections = new SectionResourceClient(this.#httpClient, 'microsoft-word', 'sections')
    this.bookmarks = new BookmarkResourceClient(this.#httpClient, 'microsoft-word', 'bookmarks')
    this.fields = new FieldResourceClient(this.#httpClient, 'microsoft-word', 'fields')
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
  async undo(): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.undo', {})
  }

  /**
   * Redo the last undone action
   */
  async redo(): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.redo', {})
  }

  /**
   * Copy the selected content to the clipboard
   */
  async copyObject(): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.copyObject', {})
  }

  /**
   * Cut the selected content to the clipboard
   */
  async cutObject(): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.cutObject', {})
  }

  /**
   * Paste content from the clipboard
   */
  async pasteObject(): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.pasteObject', {})
  }

  /**
   * Select all content in the document
   */
  async selectAll(): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.selectAll', {})
  }

  /**
   * Find text in the document
   */
  async find(findText: string, matchCase?: boolean, matchWholeWord?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.find', {
      findText,
      matchCase,
      matchWholeWord,
    })
  }

  /**
   * Replace text in the document
   */
  async replace(findText: string, replaceWith: string, replaceAll?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.replace', {
      findText,
      replaceWith,
      replaceAll,
    })
  }

  /**
   * Insert text at the specified location
   */
  async insertText(text: string, at?: number): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.insertText', { text, at })
  }

  /**
   * Create a new document
   */
  async createNewDocument(attachedTemplate?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('microsoft-word.app.createNewDocument', {
      attachedTemplate,
    })
  }
}
