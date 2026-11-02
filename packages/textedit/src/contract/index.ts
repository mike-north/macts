/**
 * The TextEdit contract: the transport-neutral description of every
 * TextEdit operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `TextEditClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `TextEditClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the TextEdit manifest; do not edit.
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

/** A TextEdit document */
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
  /**
   * The text content of the document.
   * Nullable. No evidence that the app always sets it.
   */
  text: string | null
}

/** Input for creating a Document. */
export interface DocumentCreateInput {
  /** The name of the document */
  name?: string
  /** Initial text content */
  text?: string
}

/** Input for updating a Document. Omitted fields are left unchanged. */
export interface DocumentUpdateInput {
  /**
   * The name of the document.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Initial text content.
   * Cannot be reset: null is rejected.
   */
  text?: string
}

/** A TextEdit document */
export interface DocumentResourceClient {
  /** List documents. */
  list(options?: CallOptions): Promise<readonly Document[]>
  /**
   * Read the document identified by `name`.
   *
   * @param name - Document name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Document>
  /** Create a document. */
  create(input: DocumentCreateInput, options?: CallOptions): Promise<Document>
}

/**
 * The TextEdit client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link textEditContract}.
 */
export interface TextEditClient {
  /** A TextEdit document */
  readonly documents: DocumentResourceClient
}

const documentRecordType: ValueType<Document> = t.record(
  {
    name: t.string({ description: 'The name of the document' }),
    path: t.optional(t.nullable(t.string(), { description: 'The file path of the document' })),
    modified: t.nullable(t.boolean(), {
      description: 'Whether the document has been modified since last save',
    }),
    text: t.nullable(t.string(), { description: 'The text content of the document' }),
  },
  { description: 'A TextEdit document' }
)

const documentCreateInputType: ValueType<DocumentCreateInput> = t.record({
  name: t.optional(t.string({ description: 'The name of the document' })),
  text: t.optional(t.string({ description: 'Initial text content' })),
})

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<TextEditClient>['resources'] = {
  Document: {
    name: 'Document',
    record: documentRecordType,
    id: t.string({ description: 'The name of the document' }),
    get: 'textedit.documents.get',
    list: 'textedit.documents.list',
  },
}

const documentListOperation: OperationDescriptor<Record<string, never>, readonly Document[]> = {
  id: 'textedit.documents.list',
  permission: 'textedit:documents:list',
  target: { command: 'list', resource: 'Document' },
  description: 'List all open documents',
  input: t.record({}),
  output: t.array(documentRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const documentGetOperation: OperationDescriptor<{ readonly name: string }, Document> = {
  id: 'textedit.documents.get',
  permission: 'textedit:documents:get',
  target: { command: 'get', resource: 'Document' },
  description: 'Get a document by name',
  input: t.record({
    name: t.string({ description: 'Document name' }),
  }),
  output: documentRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Document name' } },
    required: ['name'],
    additionalProperties: false,
  },
}

const documentCreateOperation: OperationDescriptor<DocumentCreateInput, Document> = {
  id: 'textedit.documents.create',
  permission: 'textedit:documents:create',
  target: { command: 'create', resource: 'Document' },
  description: 'Create a new document',
  input: documentCreateInputType,
  output: documentRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The name of the document' },
      text: { type: 'string', description: 'Initial text content' },
    },
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<TextEditClient>['operations'] = {
  'textedit.documents.list': documentListOperation,
  'textedit.documents.get': documentGetOperation,
  'textedit.documents.create': documentCreateOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): TextEditClient {
  return {
    documents: {
      list: (options) => runtime.invoke(documentListOperation, {}, options),
      get: (name, options) => runtime.invoke(documentGetOperation, { name }, options),
      create: (input, options) => runtime.invoke(documentCreateOperation, input, options),
    },
  }
}

/**
 * The TextEdit contract. Pass it to a client factory to obtain a
 * {@link TextEditClient}.
 */
export const textEditContract: AppContract<TextEditClient> = {
  app: 'textedit',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
