/**
 * The Preview contract: the transport-neutral description of every
 * Preview operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `PreviewClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `PreviewClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Preview manifest; do not edit.
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

/** A Preview document */
export interface Document {
  /**
   * The name of the document.
   * Never null: the primary identifier.
   */
  name: string
  /**
   * The file path of the document.
   * Nullable. No evidence that the app always sets it.
   */
  readonly path?: string | null
  /**
   * Whether the document has been modified since last save.
   * Nullable. No evidence that the app always sets it.
   */
  readonly modified: boolean | null
}

/** Input for creating a Document. */
export interface DocumentCreateInput {
  /** The name of the document */
  name?: string
}

/** Input for updating a Document. Omitted fields are left unchanged. */
export interface DocumentUpdateInput {
  /**
   * The name of the document.
   * Cannot be reset: null is rejected.
   */
  name?: string
}

/** A Preview document */
export interface DocumentResourceClient {
  /** List documents. */
  list(options?: CallOptions): Promise<readonly Document[]>
  /**
   * Read the document identified by `name`.
   *
   * @param name - Document name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Document>
}

/**
 * The Preview client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link previewContract}.
 */
export interface PreviewClient {
  /** A Preview document */
  readonly documents: DocumentResourceClient
}

const documentRecordType: ValueType<Document> = t.record(
  {
    name: t.string({ description: 'The name of the document' }),
    path: t.optional(t.nullable(t.string(), { description: 'The file path of the document' })),
    modified: t.nullable(t.boolean(), {
      description: 'Whether the document has been modified since last save',
    }),
  },
  { description: 'A Preview document' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<PreviewClient>['resources'] = {
  Document: {
    name: 'Document',
    record: documentRecordType,
    id: t.string({ description: 'The name of the document' }),
    get: 'preview.documents.get',
    list: 'preview.documents.list',
  },
}

const documentListOperation: OperationDescriptor<Record<string, never>, readonly Document[]> = {
  id: 'preview.documents.list',
  permission: 'preview:documents:list',
  target: { command: 'list', resource: 'Document' },
  description: 'List all open documents',
  input: t.record({}),
  output: t.array(documentRecordType),
}

const documentGetOperation: OperationDescriptor<{ readonly name: string }, Document> = {
  id: 'preview.documents.get',
  permission: 'preview:documents:get',
  target: { command: 'get', resource: 'Document' },
  description: 'Get a document by name',
  input: t.record({
    name: t.string({ description: 'Document name' }),
  }),
  output: documentRecordType,
}

/** Every operation, keyed by its identity. */
const operations: AppContract<PreviewClient>['operations'] = {
  'preview.documents.list': documentListOperation,
  'preview.documents.get': documentGetOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): PreviewClient {
  return {
    documents: {
      list: (options) => runtime.invoke(documentListOperation, {}, options),
      get: (name, options) => runtime.invoke(documentGetOperation, { name }, options),
    },
  }
}

/**
 * The Preview contract. Pass it to a client factory to obtain a
 * {@link PreviewClient}.
 */
export const previewContract: AppContract<PreviewClient> = {
  app: 'preview',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
