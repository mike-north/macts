/**
 * Runtime tests for the canonical structured error classes and registry.
 *
 * Expected codes and names come from the decision record's error table
 * (phases/13-sdk-value-and-execution-contracts.md, D6), written out here by
 * hand rather than read back from the implementation.
 */

import { describe, expect, it } from 'vitest'
import {
  ERROR_CLASSES,
  MactsError,
  PermissionDeniedError,
  TargetNotFoundError,
  TransportError,
  ValidationError,
  type WireErrorCode,
} from '../index.js'

/** Wire code → class name, per the D6 table. */
const EXPECTED_WIRE_CLASSES: Record<WireErrorCode, string> = {
  VALIDATION_FAILED: 'ValidationError',
  UNEXPECTED_VALUE: 'UnexpectedValueError',
  UNAUTHENTICATED: 'AuthenticationError',
  RATE_LIMITED: 'RateLimitedError',
  PERMISSION_DENIED: 'PermissionDeniedError',
  POLICY_DENIED: 'PolicyDeniedError',
  APPROVAL_PENDING: 'ApprovalPendingError',
  APPROVAL_REJECTED: 'ApprovalRejectedError',
  TARGET_NOT_FOUND: 'TargetNotFoundError',
  FILE_NOT_FOUND: 'FileNotFoundError',
  INVALID_SELECTION: 'InvalidSelectionError',
  COLLECTION_CHANGED: 'CollectionChangedError',
  APP_UNAVAILABLE: 'AppUnavailableError',
  APP_AUTHORIZATION_REQUIRED: 'AppAuthorizationRequiredError',
  APP_OPERATION_FAILED: 'AppOperationError',
  TIMEOUT: 'OperationTimeoutError',
  CANCELLED: 'OperationCancelledError',
  TRANSFER_FAILED: 'TransferError',
  INTERNAL: 'InternalError',
}

describe('structured error classes', () => {
  it('carry code, name, message, details, and cause', () => {
    const cause = new Error('bridge failure')
    const error = new TargetNotFoundError('No such event', { resource: 'events' }, { cause })

    expect(error.code).toBe('TARGET_NOT_FOUND')
    expect(error.name).toBe('TargetNotFoundError')
    expect(error.message).toBe('No such event')
    expect(error.details).toEqual({ resource: 'events' })
    expect(error.cause).toBe(cause)
  })

  it('are instances of their own class, MactsError, and Error', () => {
    const error = new ValidationError('bad input', {
      issues: [{ path: ['start'], message: 'Expected a date' }],
    })

    expect(error).toBeInstanceOf(ValidationError)
    expect(error).toBeInstanceOf(MactsError)
    expect(error).toBeInstanceOf(Error)
  })

  it('keeps distinct failures distinct', () => {
    const missing = new TargetNotFoundError('No such event', {})
    const denied = new PermissionDeniedError('Missing permission', {
      required: 'calendar:events:get',
    })

    expect(missing).not.toBeInstanceOf(PermissionDeniedError)
    expect(denied).not.toBeInstanceOf(TargetNotFoundError)
    expect(missing.code).not.toBe(denied.code)
  })

  it('has a stack trace', () => {
    expect(new TargetNotFoundError('No such event', {}).stack).toContain('TargetNotFoundError')
  })
})

describe('ERROR_CLASSES registry', () => {
  it('has exactly the wire codes', () => {
    expect(Object.keys(ERROR_CLASSES).sort()).toEqual(Object.keys(EXPECTED_WIRE_CLASSES).sort())
  })

  it.each(Object.entries(EXPECTED_WIRE_CLASSES))(
    'reconstructs %s as %s carrying the same code',
    (code, className) => {
      const Constructor = ERROR_CLASSES[code as WireErrorCode] as new (
        message: string,
        details: never
      ) => MactsError
      const error = new Constructor('reconstructed', {} as never)

      expect(error.code).toBe(code)
      expect(error.name).toBe(className)
      expect(error).toBeInstanceOf(MactsError)
    }
  )

  it('excludes the client-only transport failure', () => {
    expect(Object.keys(ERROR_CLASSES)).not.toContain('TRANSPORT_FAILED')
    expect(new TransportError('unreachable', { reason: 'unreachable' }).code).toBe(
      'TRANSPORT_FAILED'
    )
  })

  it('cannot be modified', () => {
    expect(Object.isFrozen(ERROR_CLASSES)).toBe(true)
  })
})
