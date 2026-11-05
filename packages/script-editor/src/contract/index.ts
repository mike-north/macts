/**
 * The Script Editor contract: the transport-neutral description of every
 * Script Editor operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `ScriptEditorClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `ScriptEditorClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Script Editor manifest; do not edit.
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

/** A Script Editor document */
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
   * The source code of the script.
   * Nullable. No evidence that the app always sets it.
   */
  contents: string | null
  /**
   * The scripting language (AppleScript or JavaScript).
   * Nullable. No evidence that the app always sets it.
   */
  language: string | null
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
  /** Initial script contents */
  contents?: string
  /** The scripting language (AppleScript or JavaScript) */
  language?: string
}

/** Input for updating a Document. Omitted fields are left unchanged. */
export interface DocumentUpdateInput {
  /**
   * The name of the document.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Initial script contents.
   * Cannot be reset: null is rejected.
   */
  contents?: string
  /**
   * The scripting language (AppleScript or JavaScript).
   * Cannot be reset: null is rejected.
   */
  language?: string
}

/** A Script Editor document */
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
  /** Create a document. */
  create(input: DocumentCreateInput, options?: CallOptions): Promise<Document>
}

/**
 * The Script Editor client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link scriptEditorContract}. Its type carries the
 * contract's resource table, {@link ScriptEditorResources}, so references can be bound to it by
 * resource; the brand has no runtime member.
 */
export interface ScriptEditorClient extends ClientBrand<ScriptEditorResources> {
  /** A Script Editor document */
  readonly documents: DocumentResourceClient
}

const documentRecordType: ValueType<Document> = t.record(
  {
    name: t.string({ description: 'The name of the document' }),
    path: t.optional(t.nullable(t.string(), { description: 'The file path of the document' })),
    contents: t.nullable(t.string(), { description: 'The source code of the script' }),
    language: t.nullable(t.string(), {
      description: 'The scripting language (AppleScript or JavaScript)',
    }),
    modified: t.nullable(t.boolean(), {
      description: 'Whether the document has been modified since last save',
    }),
  },
  { description: 'A Script Editor document' }
)

const documentCreateInputType: ValueType<DocumentCreateInput> = t.record({
  name: t.optional(t.string({ description: 'The name of the document' })),
  contents: t.optional(t.string({ description: 'Initial script contents' })),
  language: t.optional(
    t.string({ description: 'The scripting language (AppleScript or JavaScript)' })
  ),
})

/**
 * The type of the resource table of {@link scriptEditorContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type ScriptEditorResources = Readonly<{
  Document: ResourceDescriptor<Document, string> & {
    readonly id: ValueType<string>
    readonly get: 'script-editor.documents.get'
    readonly list: 'script-editor.documents.list'
  }
}>

/**
 * The resource table: the implementation of {@link ScriptEditorResources}, which
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
    get: 'script-editor.documents.get',
    list: 'script-editor.documents.list',
  },
} satisfies ScriptEditorResources

const documentListOperation: OperationDescriptor<Record<string, never>, Page<Document>> = {
  id: 'script-editor.documents.list',
  permission: 'script-editor:documents:list',
  target: { command: 'list', resource: 'Document' },
  description: 'List all open script documents',
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
  id: 'script-editor.documents.get',
  permission: 'script-editor:documents:get',
  target: { command: 'get', resource: 'Document' },
  description: 'Get a script document by name',
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
  id: 'script-editor.documents.create',
  permission: 'script-editor:documents:create',
  target: { command: 'create', resource: 'Document' },
  description: 'Create a new script document',
  input: documentCreateInputType,
  output: documentRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The name of the document' },
      contents: { type: 'string', description: 'Initial script contents' },
      language: {
        type: 'string',
        description: 'The scripting language (AppleScript or JavaScript)',
      },
    },
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ScriptEditorClient>['operations'] = {
  'script-editor.documents.list': documentListOperation,
  'script-editor.documents.get': documentGetOperation,
  'script-editor.documents.create': documentCreateOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): ScriptEditorClient {
  return {
    documents: {
      list: (options) => runtime.invoke(documentListOperation, {}, options),
      get: (name, options) => runtime.invoke(documentGetOperation, { name }, options),
      create: (input, options) => runtime.invoke(documentCreateOperation, input, options),
    },
  }
}

/**
 * The Script Editor contract. Pass it to a client factory to obtain a
 * {@link ScriptEditorClient}.
 */
export const scriptEditorContract: AppContract<ScriptEditorClient, ScriptEditorResources> = {
  app: 'script-editor',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
