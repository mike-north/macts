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
  type ClientRuntime,
  type OperationDescriptor,
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
 * The System Information client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link systemInformationContract}.
 */
export interface SystemInformationClient {
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
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<SystemInformationClient>['resources'] = {
  Document: {
    name: 'Document',
    record: documentRecordType,
    id: t.string({ description: 'The document name' }),
    get: 'system-information.documents.get',
    list: 'system-information.documents.list',
  },
}

const documentListOperation: OperationDescriptor<Record<string, never>, readonly Document[]> = {
  id: 'system-information.documents.list',
  permission: 'system-information:documents:list',
  target: { command: 'list', resource: 'Document' },
  description: 'List all system profile documents',
  input: t.record({}),
  output: t.array(documentRecordType),
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
}

const appSendOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-information.app.send',
  permission: 'system-information:app:send',
  target: { command: 'send' },
  description: 'Send system information to AppleCare',
  input: t.record({}),
  output: t.none(),
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
export const systemInformationContract: AppContract<SystemInformationClient> = {
  app: 'system-information',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
