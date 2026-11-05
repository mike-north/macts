/**
 * The System Information contract: the transport-neutral description of every
 * System Information operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `SystemInformationClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `SystemInformationClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the System Information manifest; do not edit.
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

/** Level of detail for system profile information */
export type DetailLevel = 'mini' | 'basic' | 'full'

/** A system profile document */
export interface Document {
  /**
   * The document name.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * Plain text representation of the system profile document.
   * Nullable. No evidence that the app always sets it.
   */
  readonly plainText: string | null
  /**
   * XML representation of the system profile document.
   * Nullable. No evidence that the app always sets it.
   */
  readonly xmlText: string | null
  /**
   * The desired level of detail for the system profile document.
   * Nullable. No evidence that the app always sets it.
   */
  detailLevel: DetailLevel | null
}

/** Input for creating a Document. */
export interface DocumentCreateInput {
  /** The desired level of detail for the system profile document */
  detailLevel?: DetailLevel
}

/** Input for updating a Document. Omitted fields are left unchanged. */
export interface DocumentUpdateInput {
  /**
   * The desired level of detail for the system profile document.
   * Cannot be reset: null is rejected.
   */
  detailLevel?: DetailLevel
}

/** A system profile document */
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
 * The System Information client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from `systemInformationContract` in the app's `/contract`
 * entry. Its type carries the contract's resource table, {@link SystemInformationResources}, so
 * references can be bound to it by resource; the brand has no runtime member.
 */
export interface SystemInformationClient extends ClientBrand<SystemInformationResources> {
  /** A system profile document */
  readonly documents: DocumentResourceClient
  /** Send system information to AppleCare */
  send(options?: CallOptions): Promise<void>
}

/** The members of {@link DetailLevel}, for its value type. */
const detailLevelMembers = ['mini', 'basic', 'full'] as const

const documentRecordType: ValueType<Document> = t.record(
  {
    name: t.string({ description: 'The document name' }),
    plainText: t.nullable(t.string(), {
      description: 'Plain text representation of the system profile document',
    }),
    xmlText: t.nullable(t.string(), {
      description: 'XML representation of the system profile document',
    }),
    detailLevel: t.nullable(t.enumeration(detailLevelMembers), {
      description: 'The desired level of detail for the system profile document',
    }),
  },
  { description: 'A system profile document' }
)

/**
 * The type of the resource table in `systemInformationContract` (the app's `/contract` entry): every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type SystemInformationResources = Readonly<{
  Document: ResourceDescriptor<Document, string> & {
    readonly id: ValueType<string>
    readonly get: 'system-information.documents.get'
    readonly list: 'system-information.documents.list'
  }
}>

/**
 * The resource table: the implementation of {@link SystemInformationResources}, which
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
    id: t.string({ description: 'The document name' }),
    get: 'system-information.documents.get',
    list: 'system-information.documents.list',
  },
} satisfies SystemInformationResources

const documentListOperation: OperationDescriptor<Record<string, never>, Page<Document>> = {
  id: 'system-information.documents.list',
  permission: 'system-information:documents:list',
  target: { command: 'list', resource: 'Document' },
  description: 'List all system profile documents',
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
  id: 'system-information.documents.get',
  permission: 'system-information:documents:get',
  target: { command: 'get', resource: 'Document' },
  description: 'Get a system profile document by name',
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

const appSendOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-information.app.send',
  permission: 'system-information:app:send',
  target: { command: 'send' },
  description: 'Send system information to AppleCare',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<SystemInformationClient>['operations'] = {
  'system-information.documents.list': documentListOperation,
  'system-information.documents.get': documentGetOperation,
  'system-information.app.send': appSendOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): SystemInformationClient {
  return {
    documents: {
      list: (options) => runtime.invoke(documentListOperation, {}, options),
      get: (name, options) => runtime.invoke(documentGetOperation, { name }, options),
    },
    send: (options) => runtime.invoke(appSendOperation, {}, options),
  }
}

/**
 * The System Information contract. Pass it to a client factory to obtain a
 * {@link SystemInformationClient}.
 */
export const systemInformationContract: AppContract<
  SystemInformationClient,
  SystemInformationResources
> = {
  app: 'system-information',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
