/**
 * Runtime tests for the structured error wire codec.
 *
 * Expected wire JSON and class selection come from the decision record's
 * error section, written out here by hand rather than read back from the
 * implementation.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D6)
 */

import { describe, expect, it } from 'vitest'
import {
  AppOperationError,
  AuthenticationError,
  MactsError,
  PermissionDeniedError,
  TransferError,
  TransportError,
  fromWireErrorEnvelope,
  toWireError,
  toWireErrorEnvelope,
  type AnyMactsError,
  type WireErrorCode,
} from '../index.js'
import {
  AppAuthorizationRequiredError,
  AppUnavailableError,
  ApprovalPendingError,
  ApprovalRejectedError,
  FileNotFoundError,
  InternalError,
  InvalidSelectionError,
  OperationCancelledError,
  OperationTimeoutError,
  PolicyDeniedError,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
} from './classes.js'

const ISSUES = [
  { path: ['a', 0], message: 'bad', code: 'not-integer' },
  { path: [], message: 'x' },
]

/** One representative error per wire code. */
const SAMPLES: Record<WireErrorCode, () => MactsError<WireErrorCode>> = {
  VALIDATION_FAILED: () => new ValidationError('invalid', { issues: ISSUES }),
  UNEXPECTED_VALUE: () => new UnexpectedValueError('unexpected', { issues: ISSUES }),
  UNAUTHENTICATED: () => new AuthenticationError('no cred', { reason: 'expired' }),
  PERMISSION_DENIED: () =>
    new PermissionDeniedError('denied', {
      required: 'notes:note:read',
      hint: 'ask an admin',
      changelog: { version: '0.3.0', previousPermission: 'notes:read', reason: 'renamed' },
    }),
  POLICY_DENIED: () => new PolicyDeniedError('policy', { permission: 'p:r:o', layer: 'host' }),
  APPROVAL_PENDING: () =>
    new ApprovalPendingError('pending', { permission: 'p:r:o', layer: 'key' }),
  APPROVAL_REJECTED: () =>
    new ApprovalRejectedError('rejected', { permission: 'p:r:o', layer: 'key', state: 'timeout' }),
  TARGET_NOT_FOUND: () => new TargetNotFoundError('missing', { resource: 'note' }),
  FILE_NOT_FOUND: () => new FileNotFoundError('no file', { path: 'a/b.txt' }),
  INVALID_SELECTION: () => new InvalidSelectionError('bad range', { resource: 'notes' }),
  APP_UNAVAILABLE: () =>
    new AppUnavailableError('gone', { app: 'Notes', reason: 'not-responding' }),
  APP_AUTHORIZATION_REQUIRED: () => new AppAuthorizationRequiredError('tcc', { app: 'Notes' }),
  APP_OPERATION_FAILED: () =>
    new AppOperationError('failed', { app: 'Notes', appErrorCode: -1728 }),
  TIMEOUT: () => new OperationTimeoutError('slow', { timeoutMs: 30000 }),
  CANCELLED: () => new OperationCancelledError('stopped', {}),
  TRANSFER_FAILED: () => new TransferError('xfer', { reason: 'too-large' }),
  INTERNAL: () => new InternalError('oops', { correlationId: 'abc-123' }),
}

const CODES = Object.keys(SAMPLES) as WireErrorCode[]

function roundTrip(error: MactsError<WireErrorCode>): unknown {
  return JSON.parse(JSON.stringify(toWireErrorEnvelope(error)))
}

function envelope(error: unknown): unknown {
  return { error }
}

function expectMismatch(result: AnyMactsError): TransportError {
  expect(result).toBeInstanceOf(TransportError)
  if (!(result instanceof TransportError)) throw new Error('unreachable')
  expect(result.code).toBe('TRANSPORT_FAILED')
  expect(result.details.reason).toBe('protocol-mismatch')
  return result
}

/**
 * Hand-written decode table: one wire envelope per code, written as raw JSON
 * text the way a service would send it, with the class the D6 table assigns
 * to that code named explicitly. Neither the JSON nor the expected class is
 * derived from a constructed sample.
 */
const DECODE_TABLE: readonly {
  readonly json: string
  readonly expectedClass: new (...args: never[]) => MactsError
  readonly expectedName: string
  readonly expectedDetails: unknown
}[] = [
  {
    json: '{"error":{"code":"VALIDATION_FAILED","message":"m","details":{"issues":[{"path":["start",0],"message":"Expected a date","code":"not-date"}]}}}',
    expectedClass: ValidationError,
    expectedName: 'ValidationError',
    expectedDetails: {
      issues: [{ path: ['start', 0], message: 'Expected a date', code: 'not-date' }],
    },
  },
  {
    json: '{"error":{"code":"UNEXPECTED_VALUE","message":"m","details":{"issues":[{"path":["status"],"message":"Unknown member"}]}}}',
    expectedClass: UnexpectedValueError,
    expectedName: 'UnexpectedValueError',
    expectedDetails: { issues: [{ path: ['status'], message: 'Unknown member' }] },
  },
  {
    json: '{"error":{"code":"UNAUTHENTICATED","message":"m","details":{"reason":"revoked"}}}',
    expectedClass: AuthenticationError,
    expectedName: 'AuthenticationError',
    expectedDetails: { reason: 'revoked' },
  },
  {
    json: '{"error":{"code":"PERMISSION_DENIED","message":"m","details":{"required":"calendar:events:create"}}}',
    expectedClass: PermissionDeniedError,
    expectedName: 'PermissionDeniedError',
    expectedDetails: { required: 'calendar:events:create' },
  },
  {
    json: '{"error":{"code":"POLICY_DENIED","message":"m","details":{"permission":"mail:messages:send","layer":"key"}}}',
    expectedClass: PolicyDeniedError,
    expectedName: 'PolicyDeniedError',
    expectedDetails: { permission: 'mail:messages:send', layer: 'key' },
  },
  {
    json: '{"error":{"code":"APPROVAL_PENDING","message":"m","details":{"permission":"mail:messages:send","layer":"host"}}}',
    expectedClass: ApprovalPendingError,
    expectedName: 'ApprovalPendingError',
    expectedDetails: { permission: 'mail:messages:send', layer: 'host' },
  },
  {
    json: '{"error":{"code":"APPROVAL_REJECTED","message":"m","details":{"permission":"mail:messages:send","layer":"host","state":"rejected"}}}',
    expectedClass: ApprovalRejectedError,
    expectedName: 'ApprovalRejectedError',
    expectedDetails: { permission: 'mail:messages:send', layer: 'host', state: 'rejected' },
  },
  {
    json: '{"error":{"code":"TARGET_NOT_FOUND","message":"m","details":{"resource":"events"}}}',
    expectedClass: TargetNotFoundError,
    expectedName: 'TargetNotFoundError',
    expectedDetails: { resource: 'events' },
  },
  {
    json: '{"error":{"code":"FILE_NOT_FOUND","message":"m","details":{"path":"/Users/me/a.pdf"}}}',
    expectedClass: FileNotFoundError,
    expectedName: 'FileNotFoundError',
    expectedDetails: { path: '/Users/me/a.pdf' },
  },
  {
    json: '{"error":{"code":"INVALID_SELECTION","message":"m","details":{"resource":"notes"}}}',
    expectedClass: InvalidSelectionError,
    expectedName: 'InvalidSelectionError',
    expectedDetails: { resource: 'notes' },
  },
  {
    json: '{"error":{"code":"APP_UNAVAILABLE","message":"m","details":{"app":"Calendar","reason":"not-installed"}}}',
    expectedClass: AppUnavailableError,
    expectedName: 'AppUnavailableError',
    expectedDetails: { app: 'Calendar', reason: 'not-installed' },
  },
  {
    json: '{"error":{"code":"APP_AUTHORIZATION_REQUIRED","message":"m","details":{"app":"Calendar"}}}',
    expectedClass: AppAuthorizationRequiredError,
    expectedName: 'AppAuthorizationRequiredError',
    expectedDetails: { app: 'Calendar' },
  },
  {
    json: '{"error":{"code":"APP_OPERATION_FAILED","message":"m","details":{"app":"Calendar"}}}',
    expectedClass: AppOperationError,
    expectedName: 'AppOperationError',
    expectedDetails: { app: 'Calendar' },
  },
  {
    json: '{"error":{"code":"TIMEOUT","message":"m","details":{"timeoutMs":5000}}}',
    expectedClass: OperationTimeoutError,
    expectedName: 'OperationTimeoutError',
    expectedDetails: { timeoutMs: 5000 },
  },
  {
    json: '{"error":{"code":"CANCELLED","message":"m","details":{}}}',
    expectedClass: OperationCancelledError,
    expectedName: 'OperationCancelledError',
    expectedDetails: {},
  },
  {
    json: '{"error":{"code":"TRANSFER_FAILED","message":"m","details":{"reason":"unknown-transfer"}}}',
    expectedClass: TransferError,
    expectedName: 'TransferError',
    expectedDetails: { reason: 'unknown-transfer' },
  },
  {
    json: '{"error":{"code":"INTERNAL","message":"m","details":{}}}',
    expectedClass: InternalError,
    expectedName: 'InternalError',
    expectedDetails: {},
  },
]

describe('hand-written decode table', () => {
  it('covers every wire code exactly once', () => {
    const codes = DECODE_TABLE.map(
      (row) => (JSON.parse(row.json) as { error: { code: string } }).error.code
    ).sort()
    // Every wire code from the D6 table, written out by hand.
    expect(codes).toEqual(
      [
        'APPROVAL_PENDING',
        'APPROVAL_REJECTED',
        'APP_AUTHORIZATION_REQUIRED',
        'APP_OPERATION_FAILED',
        'APP_UNAVAILABLE',
        'CANCELLED',
        'FILE_NOT_FOUND',
        'INTERNAL',
        'INVALID_SELECTION',
        'PERMISSION_DENIED',
        'POLICY_DENIED',
        'TARGET_NOT_FOUND',
        'TIMEOUT',
        'TRANSFER_FAILED',
        'UNAUTHENTICATED',
        'UNEXPECTED_VALUE',
        'VALIDATION_FAILED',
      ].sort()
    )
  })

  it.each(DECODE_TABLE)('$expectedName decodes from hand-written JSON', (row) => {
    const decoded = fromWireErrorEnvelope(JSON.parse(row.json))
    expect(decoded).toBeInstanceOf(row.expectedClass)
    expect(decoded).toBeInstanceOf(MactsError)
    expect(decoded.name).toBe(row.expectedName)
    expect(decoded.message).toBe('m')
    expect(decoded.details).toEqual(row.expectedDetails)
  })
})

describe('round trip', () => {
  it.each(CODES)('%s survives encode, JSON, decode as the same class', (code) => {
    const original = SAMPLES[code]()
    const encoded = roundTrip(original)
    const decoded = fromWireErrorEnvelope(encoded)

    expect(decoded).toBeInstanceOf(original.constructor)
    expect(decoded).toBeInstanceOf(MactsError)
    expect(decoded.code).toBe(code)
    expect(decoded.message).toBe(original.message)
    expect(decoded.details).toEqual(original.details)
    expect(decoded.cause).toBeUndefined()
    expect(Object.hasOwn(decoded, 'cause')).toBe(false)
  })

  it.each(CODES)('%s encodes exactly code, message, details', (code) => {
    const original = SAMPLES[code]()
    const wire = toWireError(original)
    expect(Object.keys(wire).sort()).toEqual(['code', 'details', 'message'])
    expect(Object.keys(toWireErrorEnvelope(original))).toEqual(['error'])
  })

  it('never encodes cause or stack', () => {
    const error = new InternalError('oops', {}, { cause: new Error('secret') })
    const json = JSON.stringify(toWireErrorEnvelope(error))
    expect(json).not.toContain('secret')
    expect(json).not.toContain('stack')
    expect(json).not.toContain('cause')
  })
})

describe('wire JSON', () => {
  it('encodes PERMISSION_DENIED with changelog', () => {
    const error = new PermissionDeniedError('Missing permission', {
      required: 'notes:note:read',
      changelog: { version: '0.3.0', previousPermission: 'notes:read' },
    })
    expect(JSON.parse(JSON.stringify(toWireErrorEnvelope(error)))).toEqual({
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Missing permission',
        details: {
          required: 'notes:note:read',
          changelog: { version: '0.3.0', previousPermission: 'notes:read' },
        },
      },
    })
  })

  it('encodes TRANSFER_FAILED', () => {
    const error = new TransferError('Transfer expired', { reason: 'expired' })
    expect(JSON.parse(JSON.stringify(toWireErrorEnvelope(error)))).toEqual({
      error: {
        code: 'TRANSFER_FAILED',
        message: 'Transfer expired',
        details: { reason: 'expired' },
      },
    })
  })

  it('decodes APP_OPERATION_FAILED with appErrorCode', () => {
    const decoded = fromWireErrorEnvelope({
      error: {
        code: 'APP_OPERATION_FAILED',
        message: 'Notes failed',
        details: { app: 'Notes', appErrorCode: -1728 },
      },
    })
    expect(decoded).toBeInstanceOf(AppOperationError)
    expect(decoded.details).toEqual({ app: 'Notes', appErrorCode: -1728 })
  })
})

describe('decode failures become protocol-mismatch', () => {
  it('unknown code carries receivedCode', () => {
    const result = expectMismatch(
      fromWireErrorEnvelope(envelope({ code: 'NEW_CODE', message: 'm', details: {} }))
    )
    expect(result.details.receivedCode).toBe('NEW_CODE')
  })

  it('client-only TRANSPORT_FAILED is not accepted from the wire', () => {
    const result = expectMismatch(
      fromWireErrorEnvelope(
        envelope({ code: 'TRANSPORT_FAILED', message: 'm', details: { reason: 'unreachable' } })
      )
    )
    expect(result.details.receivedCode).toBe('TRANSPORT_FAILED')
  })

  it('inherited property names are not codes', () => {
    const result = expectMismatch(
      fromWireErrorEnvelope(envelope({ code: 'toString', message: 'm', details: {} }))
    )
    expect(result.details.receivedCode).toBe('toString')
  })

  it('truncates a long receivedCode to 64 characters', () => {
    const result = expectMismatch(
      fromWireErrorEnvelope(envelope({ code: 'X'.repeat(500), message: 'm', details: {} }))
    )
    expect(result.details.receivedCode).toBe('X'.repeat(64))
  })

  it('non-string code has no receivedCode', () => {
    const result = expectMismatch(
      fromWireErrorEnvelope(envelope({ code: 42, message: 'm', details: {} }))
    )
    expect(Object.hasOwn(result.details, 'receivedCode')).toBe(false)
  })

  it('details failing their schema', () => {
    const result = expectMismatch(
      fromWireErrorEnvelope(
        envelope({ code: 'UNAUTHENTICATED', message: 'm', details: { reason: 'nope' } })
      )
    )
    expect(result.details.receivedCode).toBe('UNAUTHENTICATED')
  })

  it.each([
    ['missing details', { code: 'TIMEOUT', message: 'm' }],
    ['array details', { code: 'CANCELLED', message: 'm', details: [] }],
    ['null details', { code: 'CANCELLED', message: 'm', details: null }],
    ['negative timeoutMs', { code: 'TIMEOUT', message: 'm', details: { timeoutMs: -1 } }],
    ['fractional timeoutMs', { code: 'TIMEOUT', message: 'm', details: { timeoutMs: 1.5 } }],
    [
      'non-finite appErrorCode',
      { code: 'APP_OPERATION_FAILED', message: 'm', details: { app: 'A', appErrorCode: Infinity } },
    ],
    [
      'malformed issue item',
      {
        code: 'VALIDATION_FAILED',
        message: 'm',
        details: { issues: [{ path: [{}], message: 'x' }] },
      },
    ],
    ['non-string message', { code: 'CANCELLED', message: 5, details: {} }],
    ['missing message', { code: 'CANCELLED', details: {} }],
  ])('%s', (_name, wire) => {
    expectMismatch(fromWireErrorEnvelope(envelope(wire)))
  })

  it.each([
    ['missing error key', {}],
    ['null body', null],
    ['undefined body', undefined],
    ['array body', []],
    ['string body', 'nope'],
    ['non-object error', { error: 'boom' }],
    ['null error', { error: null }],
    ['array error', { error: [] }],
  ])('%s', (_name, body) => {
    const result = expectMismatch(fromWireErrorEnvelope(body))
    expect(Object.hasOwn(result.details, 'receivedCode')).toBe(false)
  })
})

describe('status option', () => {
  it('is carried into TransportError details', () => {
    const result = expectMismatch(fromWireErrorEnvelope('nope', { status: 502 }))
    expect(result.details.status).toBe(502)
  })

  it('is absent from details when not supplied', () => {
    const result = expectMismatch(fromWireErrorEnvelope('nope'))
    expect(Object.hasOwn(result.details, 'status')).toBe(false)
  })

  it('does not select the class: 404 with PERMISSION_DENIED is PermissionDeniedError', () => {
    const decoded = fromWireErrorEnvelope(
      envelope({ code: 'PERMISSION_DENIED', message: 'm', details: { required: 'a:b:c' } }),
      { status: 404 }
    )
    expect(decoded).toBeInstanceOf(PermissionDeniedError)
    expect(decoded.details).toEqual({ required: 'a:b:c' })
  })
})

describe('unknown detail keys', () => {
  it('are stripped from the reconstructed details', () => {
    const decoded = fromWireErrorEnvelope(
      envelope({
        code: 'TRANSFER_FAILED',
        message: 'm',
        details: { reason: 'expired', extra: 'x', nested: { a: 1 } },
      })
    )
    expect(decoded).toBeInstanceOf(TransferError)
    expect(decoded.details).toEqual({ reason: 'expired' })
  })
})

describe('encoding a client-only error', () => {
  it('throws TypeError for TransportError passed via cast', () => {
    const error = new TransportError('x', { reason: 'unreachable' })
    // Cast is the point of the test: the type system forbids this call.
    const cast = error as unknown as MactsError<WireErrorCode>
    expect(() => toWireError(cast)).toThrow(TypeError)
    expect(() => toWireErrorEnvelope(cast)).toThrow(TypeError)
  })
})

describe('encoding details beyond their contract', () => {
  it('drops undeclared detail fields so they never leave the service', () => {
    // Cast is the point of the test: a producer attached a field the
    // PERMISSION_DENIED contract does not declare.
    const details = { required: 'mail:messages:send', token: 'secret' } as unknown as {
      required: string
    }
    const wire = toWireError(new PermissionDeniedError('denied', details))
    expect(wire.details).toEqual({ required: 'mail:messages:send' })
    expect(JSON.stringify(wire)).not.toContain('secret')
  })

  it('throws TypeError when declared details violate their schema', () => {
    const details = { reason: 'nope' } as unknown as { reason: 'expired' }
    expect(() => toWireError(new TransferError('x', details))).toThrow(TypeError)
  })
})
