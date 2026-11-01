/**
 * The Safari contract: the transport-neutral description of every
 * Safari operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `SafariClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `SafariClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { safariContract } from '@macts/safari/contract'
 *
 * const client = createClient(safariContract, { token, url })
 * ```
 *
 * Generated from the Safari manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type OperationDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** A Safari document (window) */
export interface Document {
  /** The document name */
  readonly name: string
  /** The unique identifier of the document */
  readonly id: string
  /** The current URL */
  url: string
}

/** A Safari tab */
export interface Tab {
  /** The tab name */
  readonly name: string
  /** The unique identifier of the tab */
  readonly id: string
  /** The tab URL */
  url: string
  /** The HTML source of the web page currently loaded in the tab */
  readonly source: string
  /** The text of the web page currently loaded in the tab */
  readonly text: string
}

/** Input for creating a Document. */
export interface DocumentCreateInput {
  /** The current URL */
  url?: string
}

/** Input for updating a Document. Omitted fields are left unchanged. */
export interface DocumentUpdateInput {
  /** The current URL */
  url?: string
}

/** Input for creating a Tab. */
export interface TabCreateInput {
  /** The tab URL */
  url?: string
}

/** Input for updating a Tab. Omitted fields are left unchanged. */
export interface TabUpdateInput {
  /** The tab URL */
  url?: string
}

/**
 * The Safari client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link safariContract}.
 */
export interface SafariClient {
  /**
   * Add a new Reading List item with the given URL. Allows a custom title and preview text to be
   * specified.
   */
  addReadingListItem(
    andPreviewText?: string,
    withTitle?: string,
    options?: CallOptions
  ): Promise<void>
  /** Applies a string of JavaScript code to a document. */
  doJavaScript(_in?: string, options?: CallOptions): Promise<void>
  /** Emails the contents of a tab. */
  emailContents(_of?: string, options?: CallOptions): Promise<void>
  /** Searches the web using Safari's current search provider. */
  searchTheWeb(_for: string, _in?: string, options?: CallOptions): Promise<void>
  /** Shows Safari's bookmarks. */
  showBookmarks(options?: CallOptions): Promise<void>
  /** Show Safari Extensions preferences. */
  showExtensionsPreferences(options?: CallOptions): Promise<void>
  /** Dispatch a message to a Safari Extension. */
  dispatchMessageToExtension(options?: CallOptions): Promise<void>
  /** Make sure that all in-memory structures are in-sync with their on-disk counterparts. */
  syncAllPlistToDisk(options?: CallOptions): Promise<void>
  /** Show Safari's Privacy Report */
  showPrivacyReport(options?: CallOptions): Promise<void>
  /** Show Safari Credit Card Settings. */
  showCreditCardSettings(options?: CallOptions): Promise<void>
}

const documentRecordType: ValueType<Document> = t.record(
  {
    name: t.string({ description: 'The document name' }),
    id: t.string({ description: 'The unique identifier of the document' }),
    url: t.string({ description: 'The current URL' }),
  },
  { description: 'A Safari document (window)' }
)

const tabRecordType: ValueType<Tab> = t.record(
  {
    name: t.string({ description: 'The tab name' }),
    id: t.string({ description: 'The unique identifier of the tab' }),
    url: t.string({ description: 'The tab URL' }),
    source: t.string({
      description: 'The HTML source of the web page currently loaded in the tab',
    }),
    text: t.string({ description: 'The text of the web page currently loaded in the tab' }),
  },
  { description: 'A Safari tab' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<SafariClient>['resources'] = {
  Document: {
    name: 'Document',
    record: documentRecordType,
    id: t.string({ description: 'The unique identifier of the document' }),
  },
  Tab: {
    name: 'Tab',
    record: tabRecordType,
    id: t.string({ description: 'The unique identifier of the tab' }),
  },
}

const appAddReadingListItemOperation: OperationDescriptor<
  { readonly andPreviewText?: string | undefined; readonly withTitle?: string | undefined },
  undefined
> = {
  id: 'safari.app.addReadingListItem',
  permission: 'safari:app:addReadingListItem',
  target: { command: 'addReadingListItem' },
  description:
    'Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.',
  input: t.record({
    andPreviewText: t.optional(
      t.string({
        description:
          'Preview text for the Reading List item, usually the first few sentences of the article',
      })
    ),
    withTitle: t.optional(t.string({ description: 'Title of the Reading List item' })),
  }),
  output: t.none(),
}

const appDoJavaScriptOperation: OperationDescriptor<
  { readonly in?: string | undefined },
  undefined
> = {
  id: 'safari.app.doJavaScript',
  permission: 'safari:app:doJavaScript',
  target: { command: 'doJavaScript' },
  description: 'Applies a string of JavaScript code to a document.',
  input: t.record({
    in: t.optional(
      t.string({ description: 'The tab that the JavaScript should be evaluated in.' })
    ),
  }),
  output: t.none(),
}

const appEmailContentsOperation: OperationDescriptor<
  { readonly of?: string | undefined },
  undefined
> = {
  id: 'safari.app.emailContents',
  permission: 'safari:app:emailContents',
  target: { command: 'emailContents' },
  description: 'Emails the contents of a tab.',
  input: t.record({
    of: t.optional(t.string({ description: 'The tab to send.' })),
  }),
  output: t.none(),
}

const appSearchTheWebOperation: OperationDescriptor<
  { readonly in?: string | undefined; readonly for: string },
  undefined
> = {
  id: 'safari.app.searchTheWeb',
  permission: 'safari:app:searchTheWeb',
  target: { command: 'searchTheWeb' },
  description: "Searches the web using Safari's current search provider.",
  input: t.record({
    in: t.optional(t.string({ description: 'The tab that the search results should shown in.' })),
    for: t.string({ description: 'The query to search for.' }),
  }),
  output: t.none(),
}

const appShowBookmarksOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'safari.app.showBookmarks',
  permission: 'safari:app:showBookmarks',
  target: { command: 'showBookmarks' },
  description: "Shows Safari's bookmarks.",
  input: t.record({}),
  output: t.none(),
}

const appShowExtensionsPreferencesOperation: OperationDescriptor<
  Record<string, never>,
  undefined
> = {
  id: 'safari.app.showExtensionsPreferences',
  permission: 'safari:app:showExtensionsPreferences',
  target: { command: 'showExtensionsPreferences' },
  description: 'Show Safari Extensions preferences.',
  input: t.record({}),
  output: t.none(),
}

const appDispatchMessageToExtensionOperation: OperationDescriptor<
  Record<string, never>,
  undefined
> = {
  id: 'safari.app.dispatchMessageToExtension',
  permission: 'safari:app:dispatchMessageToExtension',
  target: { command: 'dispatchMessageToExtension' },
  description: 'Dispatch a message to a Safari Extension.',
  input: t.record({}),
  output: t.none(),
}

const appSyncAllPlistToDiskOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'safari.app.syncAllPlistToDisk',
  permission: 'safari:app:syncAllPlistToDisk',
  target: { command: 'syncAllPlistToDisk' },
  description:
    'Make sure that all in-memory structures are in-sync with their on-disk counterparts.',
  input: t.record({}),
  output: t.none(),
}

const appShowPrivacyReportOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'safari.app.showPrivacyReport',
  permission: 'safari:app:showPrivacyReport',
  target: { command: 'showPrivacyReport' },
  description: "Show Safari's Privacy Report",
  input: t.record({}),
  output: t.none(),
}

const appShowCreditCardSettingsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'safari.app.showCreditCardSettings',
  permission: 'safari:app:showCreditCardSettings',
  target: { command: 'showCreditCardSettings' },
  description: 'Show Safari Credit Card Settings.',
  input: t.record({}),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<SafariClient>['operations'] = {
  'safari.app.addReadingListItem': appAddReadingListItemOperation,
  'safari.app.doJavaScript': appDoJavaScriptOperation,
  'safari.app.emailContents': appEmailContentsOperation,
  'safari.app.searchTheWeb': appSearchTheWebOperation,
  'safari.app.showBookmarks': appShowBookmarksOperation,
  'safari.app.showExtensionsPreferences': appShowExtensionsPreferencesOperation,
  'safari.app.dispatchMessageToExtension': appDispatchMessageToExtensionOperation,
  'safari.app.syncAllPlistToDisk': appSyncAllPlistToDiskOperation,
  'safari.app.showPrivacyReport': appShowPrivacyReportOperation,
  'safari.app.showCreditCardSettings': appShowCreditCardSettingsOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): SafariClient {
  return {
    addReadingListItem: (andPreviewText, withTitle, options) =>
      runtime.invoke(appAddReadingListItemOperation, { andPreviewText, withTitle }, options),
    doJavaScript: (_in, options) => runtime.invoke(appDoJavaScriptOperation, { in: _in }, options),
    emailContents: (_of, options) =>
      runtime.invoke(appEmailContentsOperation, { of: _of }, options),
    searchTheWeb: (_for, _in, options) =>
      runtime.invoke(appSearchTheWebOperation, { in: _in, for: _for }, options),
    showBookmarks: (options) => runtime.invoke(appShowBookmarksOperation, {}, options),
    showExtensionsPreferences: (options) =>
      runtime.invoke(appShowExtensionsPreferencesOperation, {}, options),
    dispatchMessageToExtension: (options) =>
      runtime.invoke(appDispatchMessageToExtensionOperation, {}, options),
    syncAllPlistToDisk: (options) => runtime.invoke(appSyncAllPlistToDiskOperation, {}, options),
    showPrivacyReport: (options) => runtime.invoke(appShowPrivacyReportOperation, {}, options),
    showCreditCardSettings: (options) =>
      runtime.invoke(appShowCreditCardSettingsOperation, {}, options),
  }
}

/**
 * The Safari contract. Pass it to a client factory to obtain a
 * {@link SafariClient}.
 */
export const safariContract: AppContract<SafariClient> = {
  app: 'safari',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
