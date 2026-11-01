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
} from '@macts/core'
import {
  AuthenticationError,
  type Authority,
  type Credential,
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
  /** Every request received, in order. */
  readonly requests: ExecutionRequest[]
}

/**
 * Build a {@link RecordingExecutor}.
 *
 * @param respond - Produces the result (or throws) for each request; defaults
 *   to a fixed wire value.
 */
export function createRecordingExecutor(
  respond: (request: ExecutionRequest) => Promise<WireValue> = () => Promise.resolve({ events: [] })
): RecordingExecutor {
  const requests: ExecutionRequest[] = []
  return {
    provider: 'recording-stub',
    requests,
    execute(request) {
      requests.push(request)
      return respond(request)
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
