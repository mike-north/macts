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
  type ClientBrand,
  type ClientRuntime,
  type OperationDescriptor,
  type Page,
  type ResourceDescriptor,
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
  /** List documents, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Document>>
  /**
   * Read the document identified by `name`. When several documents share the same name, the first
   * match in the app's order is used, and the operation does not fail as ambiguous.
   *
   * @param name - Document name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Document>
}

/**
 * The Preview client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link previewContract}. Its type carries the contract's
 * resource table, {@link PreviewResources}, so references can be bound to it by resource; the brand
 * has no runtime member.
 */
export interface PreviewClient extends ClientBrand<PreviewResources> {
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
 * The type of the resource table of {@link previewContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type PreviewResources = Readonly<{
  Document: ResourceDescriptor<Document, string> & {
    readonly id: ValueType<string>
    readonly get: 'preview.documents.get'
    readonly list: 'preview.documents.list'
  }
}>

/**
 * The resource table: the implementation of {@link PreviewResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
  Document: {
    name: 'Document',
    record: documentRecordType,
    id: t.string({ description: 'The name of the document' }),
    get: 'preview.documents.get',
    list: 'preview.documents.list',
  },
} satisfies PreviewResources

const documentListOperation: OperationDescriptor<Record<string, never>, Page<Document>> = {
  id: 'preview.documents.list',
  permission: 'preview:documents:list',
  target: { command: 'list', resource: 'Document' },
  description: 'List all open documents',
  input: t.record({}),
  output: t.page(documentRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Document name' } },
    required: ['name'],
    additionalProperties: false,
  },
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
export const previewContract: AppContract<PreviewClient, PreviewResources> = {
  app: 'preview',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
