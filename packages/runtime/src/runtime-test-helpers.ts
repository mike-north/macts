/**
 * Shared fixtures and fakes for invocation-pipeline tests.
 *
 * The recording executor here is the stand-in second `Executor`: it
 * proves that the runtime dispatches through the executor seam, wired at
 * construction, without any Mac app. It exists only in tests; production code
 * has no stub executor.
 */

import type {
  AppManifest,
  ApprovalDecision,
  ApprovalProvider,
  ApprovalRequest,
  ApprovalRequestContext,
  AuditRecord,
  AuditWriter,
  ExecutionRequest,
  Executor,
  GovernancePolicy,
  ResolutionRequest,
} from '@macts/core'
import {
  AuthenticationError,
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type Authority,
  type Credential,
  type OperationId,
  type WireValue,
} from '@macts/contracts'
import type { CredentialVerifier } from './invocation/verifier.js'

/**
 * A small calendar app: a read, a write with a required parameter, and a
 * delete whose permission was renamed.
 *
 * Operation ids, permissions, and risk classes (hand-derived):
 *
 * - `calendar.events.list`   — `calendar:events:list`, read
 * - `calendar.events.create` — `calendar:events:create`, write; requires `summary`
 * - `calendar.events.delete` — `calendar:events:delete` (declared), delete;
 *   formerly `calendar:events:remove`
 */
export const CALENDAR_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Calendar', bundleId: 'com.apple.iCal', tccEntitlements: ['calendar'] },
  resources: {
    Event: {
      name: 'Event',
      plural: 'Events',
      description: 'An event',
      properties: {},
      identifiers: [{ property: 'uid', primary: true }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    list: {
      name: 'list',
      description: 'List events',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [],
    },
    create: {
      name: 'create',
      description: 'Create an event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [
        { name: 'summary', type: 'string', description: 'Title', required: true },
        { name: 'allDay', type: 'boolean', description: 'All day', required: false },
      ],
    },
    delete: {
      name: 'delete',
      description: 'Delete an event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [],
      permission: 'calendar:events:delete',
      permissionHistory: [
        {
          version: '0.2.0',
          permission: 'calendar:events:remove',
          changed: '2026-01-15',
          reason: 'Aligned with the delete verb',
        },
      ],
    },
  },
}

/**
 * A small library app for reference resolution: books on shelves, pages, and
 * stamps.
 *
 * Which command resolves each resource's references, and the resulting
 * operation ids and permissions (hand-derived from the manifest route rules,
 * `app.resource.commandKey` and `app:resource:commandKey`):
 *
 * - `Shelf` (identifier `code`): get `library.shelves.get`, list
 *   `library.shelves.list`. Shelves contain books.
 * - `Book` (identifier `isbn`): get `library.books.lookupBook` (the command
 *   keyed `lookupBook` declares the CRUD shape `get`), list
 *   `library.books.list`.
 *
 * Shelf and book identifiers are claimed unique and both record a supported
 * range read, so their lists page.
 * - `Page` (no identifier, so selector forms only): list `library.pages.list`,
 *   and no get.
 * - `Stamp` (integer identifier `serial`): get `library.stamps.get`, and no
 *   list.
 *
 * `describeBook` reads a book too, but declares no CRUD shape, so it never
 * resolves references.
 */
/**
 * A uniqueness claim, with its evidence, for a fixture identifier: a list
 * pages only when its resource's primary identifier is claimed unique, and its
 * resource records a supported range read ({@link RANGE_READ_SUPPORTED}).
 */
export const UNIQUE_CLAIM = {
  unique: true,
  evidence: { unique: { source: 'curated', note: 'Test fixture: no two items share an id' } },
} as const

/**
 * A range read marker for a fixture resource: a list pages only when its
 * resource also records that the app reads ranges of its collection.
 */
export const RANGE_READ_SUPPORTED = {
  rangeRead: {
    supported: true,
    read: 'range',
    evidence: {
      source: 'probe',
      observedAt: '2026-01-15T10:30:00.000Z',
      bundleId: 'com.example.library',
      appVersion: '1.0',
      osVersion: '27.2',
      pageMs: 400,
      columnMs: 900,
      items: 120,
    },
  },
} as const

export const LIBRARY_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Library', bundleId: 'com.example.library', tccEntitlements: [] },
  resources: {
    Shelf: {
      name: 'Shelf',
      plural: 'Shelves',
      description: 'A shelf',
      properties: {},
      identifiers: [{ property: 'code', primary: true, ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    },
    Book: {
      name: 'Book',
      plural: 'Books',
      description: 'A book',
      properties: {},
      identifiers: [{ property: 'isbn', primary: true, ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    },
    Page: { name: 'Page', plural: 'Pages', description: 'A page', properties: {} },
    Stamp: {
      name: 'Stamp',
      plural: 'Stamps',
      description: 'A stamp',
      // Declared so the manifest's identifier type agrees with the contract's
      // `t.integer()` identifier, which registration checks.
      properties: {
        serial: { access: 'r', type: 'integer', optional: false, description: 'The serial' },
      },
      identifiers: [{ property: 'serial', primary: true }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    describeBook: {
      name: 'describe',
      description: 'Describe a book',
      scope: 'resource',
      resourceType: 'Book',
      parameters: [{ name: 'isbn', type: 'string', description: 'ISBN', required: true }],
    },
    get: {
      name: 'get',
      description: 'Get one item',
      scope: 'resource',
      resourceType: ['Shelf', 'Stamp'],
      parameters: [{ name: 'id', type: 'string', description: 'Identifier', required: true }],
    },
    lookupBook: {
      name: 'get',
      description: 'Get one book',
      scope: 'resource',
      resourceType: 'Book',
      parameters: [{ name: 'isbn', type: 'string', description: 'ISBN', required: true }],
    },
    list: {
      name: 'list',
      description: 'List items',
      scope: 'resource',
      resourceType: ['Shelf', 'Book', 'Page'],
      parameters: [],
    },
  },
}

/** A shelf record. */
export const SHELF_RECORD = t.record({ code: t.string(), label: t.string() })
/** A book record; `pages` is an integer, so its wire form is a control record. */
export const BOOK_RECORD = t.record({ isbn: t.string(), title: t.string(), pages: t.integer() })
/** A page record. */
export const PAGE_RECORD = t.record({ text: t.string() })
/** A stamp record. */
export const STAMP_RECORD = t.record({ serial: t.integer() })

/** The input of a list whose identifier is claimed unique: the paging inputs only. */
export const PAGED_LIST_INPUT = t.record({ ...t.pageInputs() })

/**
 * One library operation descriptor. Its input is empty unless given; the
 * lists whose identifiers are claimed unique take the paging inputs, as a generator emits
 * them.
 */
function libraryOperation(
  id: OperationId,
  command: string,
  resource: string,
  output: AnyOperationDescriptor['output'],
  input: AnyOperationDescriptor['input'] = t.record({})
): AnyOperationDescriptor {
  const [app = '', segment = '', commandSegment = ''] = id.split('.')
  return {
    id,
    permission: `${app}:${segment}:${commandSegment}`,
    target: { command, resource },
    description: `${command} ${resource}`,
    input,
    output,
  }
}

/** The descriptors of {@link LIBRARY_MANIFEST}'s operations, as a generator would emit them. */
const LIBRARY_OPERATIONS: readonly AnyOperationDescriptor[] = [
  libraryOperation('library.shelves.get', 'get', 'Shelf', SHELF_RECORD),
  libraryOperation('library.shelves.list', 'list', 'Shelf', t.page(SHELF_RECORD), PAGED_LIST_INPUT),
  libraryOperation('library.books.lookupBook', 'lookupBook', 'Book', BOOK_RECORD),
  libraryOperation('library.books.describeBook', 'describeBook', 'Book', t.string()),
  libraryOperation('library.books.list', 'list', 'Book', t.page(BOOK_RECORD), PAGED_LIST_INPUT),
  libraryOperation('library.pages.list', 'list', 'Page', t.page(PAGE_RECORD)),
  libraryOperation('library.stamps.get', 'get', 'Stamp', STAMP_RECORD),
]

/**
 * A hand-built contract for {@link LIBRARY_MANIFEST}, standing in for a
 * generated one. Its resource table is the app's reference registry.
 */
export function libraryContract(): AppContract<unknown> {
  return {
    app: 'library',
    operations: Object.fromEntries(LIBRARY_OPERATIONS.map((op) => [op.id, op])),
    resources: {
      Shelf: {
        name: 'Shelf',
        record: SHELF_RECORD,
        id: t.string(),
        get: 'library.shelves.get',
        list: 'library.shelves.list',
      },
      Book: {
        name: 'Book',
        record: BOOK_RECORD,
        id: t.string(),
        get: 'library.books.lookupBook',
        list: 'library.books.list',
      },
      Page: { name: 'Page', record: PAGE_RECORD, list: 'library.pages.list' },
      Stamp: { name: 'Stamp', record: STAMP_RECORD, id: t.integer(), get: 'library.stamps.get' },
    },
    loadManifest: () => Promise.resolve(LIBRARY_MANIFEST),
    bind: () => ({}),
  }
}

/** The fixed instant every test clock reports. */
export const FIXED_NOW = new Date('2026-03-04T05:06:07.000Z')

/** A clock that always reports {@link FIXED_NOW}. */
export const fixedClock = (): Date => FIXED_NOW

/** Policy that holds every calendar operation for human confirmation. */
export const CONFIRM_FIRST_CALENDAR: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: 'calendar',
      disposition: 'confirm-first',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** Policy that forbids everything. */
export const FORBID_ALL: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [],
  tags: [],
}

/** An executor that records every request it receives and answers with a canned result. */
export interface RecordingExecutor extends Executor {
  /** Every execution request received, in order. */
  readonly requests: ExecutionRequest[]
  /** Every resolution request received, in order. */
  readonly resolutions: ResolutionRequest[]
}

/**
 * Build a {@link RecordingExecutor}.
 *
 * @param respond - Produces the result (or throws) for each execution request;
 *   defaults to a fixed wire value.
 * @param respondToResolution - Produces the result (or throws) for each
 *   resolution request; defaults to `{}` for a single reference and `[]` for a
 *   collection.
 */
export function createRecordingExecutor(
  respond: (request: ExecutionRequest) => Promise<WireValue> = () =>
    Promise.resolve({ events: [] }),
  respondToResolution: (request: ResolutionRequest) => Promise<WireValue> = (request) =>
    Promise.resolve(request.reference.cardinality === 'many' ? [] : {})
): RecordingExecutor {
  const requests: ExecutionRequest[] = []
  const resolutions: ResolutionRequest[] = []
  return {
    provider: 'recording-stub',
    requests,
    resolutions,
    execute(request) {
      requests.push(request)
      return respond(request)
    },
    resolve(request) {
      resolutions.push(request)
      return respondToResolution(request)
    },
  }
}

/** A verifier fake that also counts how often it was asked. */
export interface FakeVerifier extends CredentialVerifier {
  /** How many credentials were presented. */
  calls(): number
}

/**
 * A verifier that recognizes a fixed set of secrets.
 *
 * @remarks
 * An empty secret is `missing`; an unrecognized one is `invalid`, mirroring the
 * key-store verifier's reasons without a key store.
 */
export function createFakeVerifier(authorities: Readonly<Record<string, Authority>>): FakeVerifier {
  let calls = 0
  return {
    calls: () => calls,
    verify(credential: Credential) {
      calls++
      const secret = credential.reveal()
      if (secret.length === 0) {
        return Promise.reject(
          new AuthenticationError('No credential was presented.', { reason: 'missing' })
        )
      }
      const authority = authorities[secret]
      return authority === undefined
        ? Promise.reject(
            new AuthenticationError('The credential could not be verified.', { reason: 'invalid' })
          )
        : Promise.resolve(authority)
    },
  }
}

/** An audit writer that keeps records in memory. */
export interface MemoryAuditWriter extends AuditWriter {
  /** Every record appended, in order. */
  readonly records: AuditRecord[]
}

/**
 * Build a {@link MemoryAuditWriter}.
 *
 * @param failOnAppend - 1-based append numbers that fail instead of recording.
 */
export function createMemoryAuditWriter(failOnAppend: readonly number[] = []): MemoryAuditWriter {
  const records: AuditRecord[] = []
  let appends = 0
  return {
    records,
    append(record) {
      appends++
      if (failOnAppend.includes(appends)) {
        return Promise.reject(new Error('audit disk full at /var/audit.jsonl'))
      }
      records.push(record)
      return Promise.resolve()
    },
  }
}

/** An approval provider that records the requests it is asked and answers with `decide`. */
export interface RecordingApprovalProvider extends ApprovalProvider {
  /** Every request received, in order. */
  readonly requests: ApprovalRequest[]
}

/** Build a {@link RecordingApprovalProvider}. */
export function createRecordingApprovalProvider(
  decide: (request: ApprovalRequest, context: ApprovalRequestContext) => Promise<ApprovalDecision>
): RecordingApprovalProvider {
  const requests: ApprovalRequest[] = []
  return {
    name: 'recording-approver',
    capabilities: { supportsPolicySuggestions: false, supportsDistinctRouting: false },
    requests,
    requestApproval(request, context) {
      requests.push(request)
      return decide(request, context)
    },
  }
}
