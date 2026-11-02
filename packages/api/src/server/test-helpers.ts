/**
 * Shared fixtures and fakes for HTTP-level tests of the server and adapter.
 *
 * Tests drive the assembled app with `app.request(...)`, injecting a recording
 * `Executor` (so no Mac app is needed and every request that reaches execution
 * is observable) and a fake `CredentialVerifier` (so authentication outcomes
 * are chosen per token without a key store). Production code has neither.
 */

import type { Hono } from 'hono'
import pino from 'pino'
import type {
  AppManifest,
  ExecutionRequest,
  Executor,
  GovernancePolicy,
  ResolutionRequest,
} from '@macts/core'
import {
  AuthenticationError,
  type AuthenticationFailureReason,
  type Authority,
  type Credential,
  type WireValue,
} from '@macts/contracts'
import type { CredentialVerifier } from '@macts/runtime'
import { createApp, type AppOptions } from './index.js'

/**
 * A small calendar app. Operation ids, permissions, and risk classes are
 * derived by hand from the manifest route rules (`app.resource.commandKey`,
 * permission `app:resource:commandKey` unless declared):
 *
 * - `calendar.events.list`   — `calendar:events:list`, read
 * - `calendar.events.create` — `calendar:events:create`, write; requires
 *   `summary`, accepts an optional `password` (to observe argument redaction)
 * - `calendar.events.delete` — `calendar:events:delete` (declared), delete;
 *   formerly `calendar:events:remove`
 * - `calendar.app.quit`      — `calendar:app:quit`, an application command
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
      returns: 'Event[]',
    },
    create: {
      name: 'create',
      description: 'Create an event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [
        { name: 'summary', type: 'string', description: 'Title', required: true },
        { name: 'password', type: 'string', description: 'A secret', required: false },
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
    quit: {
      name: 'quit',
      description: 'Quit the app',
      scope: 'application',
      parameters: [],
    },
  },
}

/** A second app, so a call outside a calendar-only policy can be made: `notes.notes.create`. */
export const NOTES_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Notes', bundleId: 'com.apple.Notes', tccEntitlements: [] },
  resources: {
    Note: { name: 'Note', plural: 'Notes', description: 'A note', properties: {} },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    create: {
      name: 'create',
      description: 'Create a note',
      scope: 'resource',
      resourceType: 'Note',
      parameters: [{ name: 'title', type: 'string', description: 'Title', required: false }],
    },
  },
}

/** Secrets the fake verifier recognizes, and the reasons it fails others with. */
export const WRITER_TOKEN = 'macts_sk_writer-token-must-never-leak'
export const READER_TOKEN = 'macts_sk_reader-token-must-never-leak'
export const LEGACY_TOKEN = 'macts_sk_legacy-token-must-never-leak'
export const MALFORMED_TOKEN = 'not-a-macts-key'
export const REVOKED_TOKEN = 'macts_sk_revoked-token-must-never-leak'
export const EXPIRED_TOKEN = 'macts_sk_expired-token-must-never-leak'

/** Holds every calendar permission. */
export const WRITER: Authority = {
  subject: 'key_writer',
  displayName: 'Calendar assistant',
  permissions: [
    'calendar:events:list',
    'calendar:events:create',
    'calendar:events:delete',
    'calendar:app:quit',
    'notes:notes:create',
  ],
}
/** Holds only `calendar:events:list`. */
export const READER: Authority = { subject: 'key_reader', permissions: ['calendar:events:list'] }
/** Holds only the permission `delete` had before it was renamed. */
export const LEGACY: Authority = { subject: 'key_legacy', permissions: ['calendar:events:remove'] }

/** A verifier fake that also counts how often it was asked. */
export interface FakeVerifier extends CredentialVerifier {
  /** How many credentials were presented. */
  calls(): number
}

/**
 * A verifier that recognizes fixed secrets.
 *
 * @remarks
 * An empty secret is `missing`; {@link MALFORMED_TOKEN}, {@link REVOKED_TOKEN},
 * and {@link EXPIRED_TOKEN} fail with their named reasons; any other
 * unrecognized secret is `invalid`. The messages are the key-store verifier's
 * fixed texts.
 */
export function createFakeVerifier(
  authorities: Readonly<Record<string, Authority>> = {
    [WRITER_TOKEN]: WRITER,
    [READER_TOKEN]: READER,
    [LEGACY_TOKEN]: LEGACY,
  }
): FakeVerifier {
  const failures: Readonly<Record<string, AuthenticationFailureReason>> = {
    '': 'missing',
    [MALFORMED_TOKEN]: 'malformed',
    [REVOKED_TOKEN]: 'revoked',
    [EXPIRED_TOKEN]: 'expired',
  }
  let calls = 0
  return {
    calls: () => calls,
    verify(credential: Credential) {
      calls++
      const secret = credential.reveal()
      const authority = authorities[secret]
      if (authority !== undefined) return Promise.resolve(authority)
      const reason = failures[secret] ?? 'invalid'
      return Promise.reject(new AuthenticationError(`Authentication failed: ${reason}`, { reason }))
    },
  }
}

/** An executor that records every request it receives and answers with `respond`. */
export interface RecordingExecutor extends Executor {
  /** Every execution request received, in order. */
  readonly requests: ExecutionRequest[]
  /** Every resolution request received, in order. */
  readonly resolutions: ResolutionRequest[]
}

/**
 * Build a {@link RecordingExecutor}; by default every execution returns
 * `{ events: [] }`, a single reference resolves to `{}`, and a collection to
 * `[]`.
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

/** A real logger whose output is captured in memory. */
export interface CapturedLogger {
  /** The logger, writing every level synchronously into {@link CapturedLogger.lines}. */
  readonly logger: pino.Logger
  /** Every serialized log line, in order. */
  readonly lines: string[]
  /** The parsed log entries at `level` (pino's numeric level: 30 info, 50 error). */
  entriesAt(level: number): Record<string, unknown>[]
}

/** Build a {@link CapturedLogger}. */
export function createCapturedLogger(): CapturedLogger {
  const lines: string[] = []
  const logger = pino(
    { level: 'trace' },
    {
      write(line: string) {
        lines.push(line)
      },
    }
  )
  return {
    logger,
    lines,
    entriesAt: (level) =>
      lines
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .filter((entry) => entry['level'] === level),
  }
}

/** pino's numeric level for `info`. */
export const INFO = 30

/** pino's numeric level for `error`. */
export const ERROR = 50

/** Policy that forbids everything. */
export const FORBID_ALL: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [],
  tags: [],
}

/** Policy that allows everything. */
export const ALLOW_ALL: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'allowed',
  apps: [],
  tags: [],
}

/** A single-app policy pinning `calendar` to `disposition`; everything else is forbidden. */
export function calendarPolicy(
  disposition: GovernancePolicy['apps'][number]['disposition']
): GovernancePolicy {
  return {
    version: '1',
    defaultDisposition: 'forbidden',
    apps: [
      {
        app: 'calendar',
        disposition,
        operations: [],
        restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
        tags: [],
      },
    ],
    tags: [],
  }
}

/** An app under test with its injected fakes. */
export interface TestServer {
  readonly app: Hono
  readonly executor: RecordingExecutor
  readonly verifier: FakeVerifier
  readonly log: CapturedLogger
}

/** What a test varies about the server under test. */
export interface TestServerOptions extends Omit<AppOptions, 'executor' | 'verifier' | 'logger'> {
  readonly manifests?: AppManifest[]
  readonly executor?: RecordingExecutor
  readonly verifier?: FakeVerifier
}

/**
 * Build the full server app over {@link CALENDAR_MANIFEST} and
 * {@link NOTES_MANIFEST} with a recording executor, the fake verifier, and a
 * captured logger. CORS, pretty JSON, and request logging are off.
 *
 * Governance is the explicit {@link ALLOW_ALL} policy unless the test supplies
 * its own, so no test reads or writes the governance files of the machine it
 * runs on. The server's default (this Mac's governance) is covered with a
 * temporary `MACTS_HOME` in `host-governance.test.ts`.
 */
export function createTestServer(options: TestServerOptions = {}): TestServer {
  const {
    manifests = [CALENDAR_MANIFEST, NOTES_MANIFEST],
    executor = createRecordingExecutor(),
    verifier = createFakeVerifier(),
    ...rest
  } = options
  const log = createCapturedLogger()
  const app = createApp(manifests, {
    cors: false,
    logging: false,
    prettyJson: false,
    executor,
    verifier,
    logger: log.logger,
    governance: { policy: ALLOW_ALL },
    ...rest,
  })
  return { app, executor, verifier, log }
}

/** POST a JSON body to an operation, presenting `token` when given. */
export function post(
  app: Hono,
  id: string,
  body: unknown = {},
  token?: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  return Promise.resolve(
    app.request(`/api/v1/rpc/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  )
}

/** The parsed D6 envelope of an error response. */
export interface ErrorBody {
  readonly error: { readonly code: string; readonly message: string; readonly details: unknown }
}

/** Parse a response body as an error envelope. */
export async function errorBody(res: Response): Promise<ErrorBody> {
  return (await res.json()) as ErrorBody
}
