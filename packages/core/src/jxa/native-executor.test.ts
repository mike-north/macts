/**
 * Tests for the native macOS executor.
 *
 * Most cases inject the transport so they need no automation host. A few run
 * the real host with scripts that send no events to any app, which is safe on
 * the macOS CI runners: constructing an application object and reading the
 * input record trigger no automation-permission prompt, a bundle identifier
 * with no installed app fails before any event is sent, and a host that kills
 * itself touches no app.
 *
 * The failure table is written by hand from the structured error registry and
 * its classification rules. Standard error samples follow the form the
 * automation host prints, `execution error: Error: <message> (<number>)`, as
 * observed on macOS 27.2 for -2700 ("Application can't be found.").
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D6, D9)
 * @see https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/reference/ASLR_error_codes.html
 */

import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  AppAuthorizationRequiredError,
  AppOperationError,
  AppUnavailableError,
  InternalError,
  InvalidSelectionError,
  MactsError,
  OperationCancelledError,
  OperationTimeoutError,
  PASSTHROUGH_PLAN,
  TargetNotFoundError,
  ValidationError,
  type OperationTarget,
  type ValuePlan,
  type WireRecord,
} from '@macts/contracts'
import type { ExecutionRequest } from '../execution/executor.js'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { JxaExecutionError, runJxa, type JxaFailureKind } from './executor.js'
import {
  composeNativeScript,
  createNativeExecutor,
  describeNativeFailure,
  type NativeFailureContext,
  type NativeRunOptions,
} from './native-executor.js'

const NOTES_MANIFEST = fileURLToPath(
  new URL('../../../../manifests/notes/app.yaml', import.meta.url)
)

/** A bundle identifier that no installed app has. */
const NOT_INSTALLED_BUNDLE_ID = 'com.example.macts.not-installed'

/** A bundle identifier present on every Mac; constructing it sends no events. */
const ALWAYS_INSTALLED_BUNDLE_ID = 'com.apple.finder'

let notes: AppManifest

beforeAll(async () => {
  notes = await loadManifest(NOTES_MANIFEST)
})

const GET_NOTE: OperationTarget = { command: 'get', resource: 'Note' }
const LIST_ACCOUNTS: OperationTarget = { command: 'list', resource: 'Account' }

/** An execution request against Notes with passthrough plans unless overridden. */
function request(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    manifest: notes,
    target: GET_NOTE,
    input: { name: 'Groceries' },
    inputPlan: PASSTHROUGH_PLAN,
    outputPlan: PASSTHROUGH_PLAN,
    ...overrides,
  }
}

/** Await `promise` and return what it rejected with, failing if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to reject')
}

/** A transport failure of `kind`, with the host's standard error output. */
function processFailure(stderr: string, kind: JxaFailureKind = 'exited'): JxaExecutionError {
  return new JxaExecutionError('Command failed', '1', stderr, undefined, { kind })
}

const STRING_PLAN: ValuePlan = { kind: 'string' }

describe('createNativeExecutor', () => {
  it('identifies the macOS provider', () => {
    expect(createNativeExecutor().provider).toBe('macos')
  })

  describe('plan gate', () => {
    it.each([
      ['input', { inputPlan: STRING_PLAN }],
      ['output', { outputPlan: STRING_PLAN }],
    ] as const)('refuses a non-passthrough %s plan with InternalError', async (_, override) => {
      const run = vi.fn()
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request(override))
      )
      expect(error).toBeInstanceOf(InternalError)
      expect(run).not.toHaveBeenCalled()
    })
  })

  describe('script composition', () => {
    it('passes the composed script and the time limit to the transport', async () => {
      const run = vi.fn<(script: string, options: NativeRunOptions) => Promise<unknown>>()
      run.mockResolvedValue({ name: 'Groceries' })
      const executor = createNativeExecutor({ transport: { run }, timeoutMs: 1234 })

      const result = await executor.execute(request())

      expect(result).toEqual({ name: 'Groceries' })
      expect(run).toHaveBeenCalledTimes(1)
      const [script, options] = run.mock.calls[0] ?? ['', { timeoutMs: 0 }]
      expect(options).toEqual({ timeoutMs: 1234 })
      expect(script).toContain('JSON.parse(')
      expect(script).toContain('Application("com.apple.Notes")')
      expect(script).toContain('app.includeStandardAdditions = true;')
      expect(script).toContain('return (function (app, args) {')
      expect(script).toContain('})(app, args);')
    })

    it('defaults the time limit to 30000 ms', async () => {
      const run = vi.fn().mockResolvedValue(null)
      await createNativeExecutor({ transport: { run } }).execute(request())
      expect(run).toHaveBeenCalledWith(expect.any(String), { timeoutMs: 30000 })
    })

    it('writes no input value into source text outside the JSON string literal', async () => {
      const run = vi.fn<(script: string, options: NativeRunOptions) => Promise<unknown>>()
      run.mockResolvedValue(null)
      const input = {
        calendarId: 'SENTINEL_CALENDAR_7f3a',
        id: 'SENTINEL_EVENT_91c2',
        summary: 'SENTINEL_SUMMARY_44d0',
      }
      const calendar = await loadManifest(
        fileURLToPath(new URL('../../../../manifests/calendar/app.yaml', import.meta.url))
      )
      await createNativeExecutor({ transport: { run } }).execute(
        request({
          manifest: calendar,
          target: { command: 'updateEvent', resource: 'Event' },
          input,
        })
      )

      const script = run.mock.calls[0]?.[0] ?? ''
      const [argsLine, ...rest] = script.split('\n')
      expect(argsLine).toMatch(/^var args = JSON\.parse\(".*"\);$/)
      for (const sentinel of Object.values(input)) {
        expect(argsLine).toContain(sentinel)
        expect(rest.join('\n')).not.toContain(sentinel)
      }
    })

    it('returns null when the script returns nothing', async () => {
      const run = vi.fn().mockResolvedValue(undefined)
      expect(await createNativeExecutor({ transport: { run } }).execute(request())).toBeNull()
    })

    it('refuses a result that is not JSON with InternalError', async () => {
      const run = vi.fn().mockResolvedValue({ when: new Date(0) })
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(InternalError)
    })

    it('rejects input missing a required parameter with ValidationError, without running', async () => {
      const run = vi.fn()
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request({ input: {} }))
      )
      expect(error).toBeInstanceOf(ValidationError)
      expect(run).not.toHaveBeenCalled()
    })

    it('fails with InternalError when the target names no manifest command', async () => {
      const run = vi.fn()
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(
          request({ target: { command: 'missing' } })
        )
      )
      expect(error).toBeInstanceOf(InternalError)
      expect(run).not.toHaveBeenCalled()
    })
  })

  describe('cancellation', () => {
    it('does not run when the signal is already aborted', async () => {
      const run = vi.fn()
      const controller = new AbortController()
      controller.abort()
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request({ signal: controller.signal }))
      )
      expect(error).toBeInstanceOf(OperationCancelledError)
      expect(run).not.toHaveBeenCalled()
    })

    it('rejects with OperationCancelledError when aborted during the run', async () => {
      const controller = new AbortController()
      let finish: (value: unknown) => void = () => undefined
      const run = vi.fn(
        () =>
          new Promise<unknown>((resolve) => {
            finish = resolve
          })
      )
      const pending = createNativeExecutor({ transport: { run } }).execute(
        request({ signal: controller.signal })
      )
      await vi.waitFor(() => {
        expect(run).toHaveBeenCalled()
      })
      controller.abort()
      const error = await rejectionOf(pending)
      finish({ late: true })
      expect(error).toBeInstanceOf(OperationCancelledError)
    })

    it('hands the caller signal to the transport, so a mid-run abort stops the script', async () => {
      const controller = new AbortController()
      const run = vi.fn<(script: string, options: NativeRunOptions) => Promise<unknown>>()
      run.mockResolvedValue(null)
      await createNativeExecutor({ transport: { run } }).execute(
        request({ signal: controller.signal })
      )
      expect(run.mock.calls[0]?.[1].signal).toBe(controller.signal)
    })

    it('reports a run failure after an abort as a cancellation', async () => {
      const controller = new AbortController()
      const run = vi.fn(() => {
        controller.abort()
        return Promise.reject(processFailure('execution error: Error: x (-1728)'))
      })
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request({ signal: controller.signal }))
      )
      expect(error).toBeInstanceOf(OperationCancelledError)
    })
  })

  describe('failures', () => {
    it('classifies a process failure and keeps the raw failure only as cause', async () => {
      const failure = processFailure("execution error: Error: Error: Can't get object. (-1728)")
      const run = vi.fn().mockRejectedValue(failure)
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(TargetNotFoundError)
      if (!(error instanceof TargetNotFoundError)) return
      expect(error.details).toEqual({ resource: 'Note' })
      expect(error.cause).toBe(failure)
    })

    it('reports a synchronous throw from the transport as a host failure', async () => {
      const run = vi.fn(() => {
        throw new Error('transport defect')
      })
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(InternalError)
    })
  })
})

describe('describeNativeFailure', () => {
  const context: NativeFailureContext = {
    app: 'Notes',
    operation: { command: 'get', resource: 'Note' },
    timeoutMs: 30000,
  }
  const appContext: NativeFailureContext = { ...context, operation: { command: 'activate' } }

  /** Host output for an error with `message` and `number`. */
  const stderr = (message: string, number: number): string =>
    `execution error: Error: Error: ${message} (${String(number)})\n`

  const cases: readonly {
    readonly name: string
    readonly error: unknown
    readonly context?: NativeFailureContext
    readonly type: abstract new (...args: never[]) => MactsError
    readonly details: unknown
  }[] = [
    {
      name: '-1728 (no such object)',
      error: processFailure(stderr("Can't get object.", -1728)),
      type: TargetNotFoundError,
      details: { resource: 'Note' },
    },
    {
      name: '-1728 for an app-level command (no resource)',
      error: processFailure(stderr("Can't get object.", -1728)),
      context: appContext,
      type: TargetNotFoundError,
      details: {},
    },
    {
      name: '-1719 (invalid index)',
      error: processFailure(stderr('Invalid index.', -1719)),
      type: InvalidSelectionError,
      details: { resource: 'Note' },
    },
    {
      name: '-1743 (not authorized)',
      error: processFailure(stderr('Not authorized to send Apple events to Notes.', -1743)),
      type: AppAuthorizationRequiredError,
      details: { app: 'Notes' },
    },
    {
      name: '-600 (not running)',
      error: processFailure(stderr("Application isn't running.", -600)),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-responding' },
    },
    {
      name: '-609 (connection invalid)',
      error: processFailure(stderr('Connection is invalid.', -609)),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-responding' },
    },
    {
      name: '-2700 with "Application can\'t be found" (observed on macOS 27.2)',
      error: processFailure(stderr("Application can't be found.", -2700)),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-installed' },
    },
    {
      name: '-2700 with a typographic apostrophe',
      error: processFailure(stderr('Application can’t be found.', -2700)),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-installed' },
    },
    {
      name: '-2700 with any other text (a script error)',
      error: processFailure(stderr('plain', -2700)),
      type: AppOperationError,
      details: { app: 'Notes', appErrorCode: -2700 },
    },
    {
      name: '-10814 (app not found)',
      error: processFailure(stderr('Application not found.', -10814)),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-installed' },
    },
    {
      // The app's own event timeout, not the executor's limit: no elapsed time
      // is claimed.
      name: '-1712 (the app did not answer in time)',
      error: processFailure(stderr('AppleEvent timed out.', -1712)),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-responding' },
    },
    {
      name: 'a process stopped by the time limit',
      error: processFailure('', 'timed-out'),
      type: OperationTimeoutError,
      details: { timeoutMs: 30000 },
    },
    {
      name: 'a process stopped by the time limit, even with a classifiable number in its output',
      error: processFailure(stderr("Can't get object.", -1728), 'timed-out'),
      type: OperationTimeoutError,
      details: { timeoutMs: 30000 },
    },
    {
      name: 'a process stopped by the caller',
      error: processFailure('', 'cancelled'),
      type: OperationCancelledError,
      details: {},
    },
    {
      // Node also reports this as a killed process; it is not a timeout.
      name: 'output beyond the output limit',
      error: processFailure('', 'output-too-large'),
      type: InternalError,
      details: {},
    },
    {
      name: 'a process killed by a signal macts did not send',
      error: processFailure('', 'signalled'),
      type: InternalError,
      details: {},
    },
    {
      name: 'a host that could not be started',
      error: processFailure('', 'not-started'),
      type: InternalError,
      details: {},
    },
    {
      name: 'output that is not JSON',
      error: processFailure('', 'unreadable-output'),
      type: InternalError,
      details: {},
    },
    {
      name: 'any other number',
      error: processFailure(stderr("Can't make or move that element into that container.", -10024)),
      type: AppOperationError,
      details: { app: 'Notes', appErrorCode: -10024 },
    },
    {
      name: 'a positive number',
      error: processFailure(stderr('The command exited with a non-zero status.', 3)),
      type: AppOperationError,
      details: { app: 'Notes', appErrorCode: 3 },
    },
    {
      name: 'an exit whose output has no number',
      error: processFailure('execution error: something went wrong\n'),
      type: InternalError,
      details: {},
    },
    {
      name: 'an exit with no output at all',
      error: processFailure(''),
      type: InternalError,
      details: {},
    },
    {
      name: 'a number in the middle of the output, not at its end',
      error: processFailure('execution error: Error (-1728) happened\n'),
      type: InternalError,
      details: {},
    },
    {
      name: 'a plain error that is not a transport failure',
      error: new Error('spawn osascript ENOENT'),
      type: InternalError,
      details: {},
    },
    {
      name: 'a non-error value',
      error: 'boom',
      type: InternalError,
      details: {},
    },
  ]

  it.each(cases)('$name', ({ error, context: override, type, details }) => {
    const described = describeNativeFailure(error, override ?? context)
    expect(described).toBeInstanceOf(type)
    expect(described.details).toEqual(details)
    expect(described.cause).toBe(error)
  })

  it.each(cases)('$name: message uses consumer vocabulary only', ({ error, context: override }) => {
    const described = describeNativeFailure(error, override ?? context)
    expect(described.message).not.toMatch(/AppleScript|JXA|AppleEvent|osascript|OSA/i)
    expect(described.message).not.toContain('execution error')
    expect(JSON.stringify(described.details)).not.toContain('execution error')
  })

  it('names the app and resource in a not-found message', () => {
    const described = describeNativeFailure(
      processFailure(stderr("Can't get object.", -1728)),
      context
    )
    expect(described.message).toContain('Notes')
    expect(described.message).toContain('Note')
  })

  it('suggests a pending permission prompt for a timeout', () => {
    const described = describeNativeFailure(processFailure('', 'timed-out'), context)
    expect(described.message).toContain('permission prompt')
    expect(described.message).toContain('30000 ms')
  })
})

describe('against the real automation host (no app events)', () => {
  it('keeps a __proto__ input key as an own property', async () => {
    const input: WireRecord = JSON.parse('{"__proto__":{"polluted":true},"plain":1}') as WireRecord
    const script = composeNativeScript(
      ALWAYS_INSTALLED_BUNDLE_ID,
      'return Object.keys(args);',
      input
    )
    expect(await runJxa(script)).toEqual(['__proto__', 'plain'])
  })

  it('reports an app that is not installed as AppUnavailableError (not-installed)', async () => {
    const executor = createNativeExecutor()
    const error = await rejectionOf(
      executor.execute(
        request({
          manifest: { ...notes, app: { ...notes.app, bundleId: NOT_INSTALLED_BUNDLE_ID } },
          target: LIST_ACCOUNTS,
          input: {},
        })
      )
    )
    expect(error).toBeInstanceOf(AppUnavailableError)
    if (!(error instanceof AppUnavailableError)) return
    expect(error.details).toEqual({ app: 'Notes', reason: 'not-installed' })
    expect(error.cause).toBeInstanceOf(JxaExecutionError)
  })

  it('classifies a missing target raised by a body as TargetNotFoundError', async () => {
    // The failure a get body raises when its item does not exist, run through
    // the real host so the reported error number is the one it prints.
    const executor = createNativeExecutor({
      transport: {
        run: (_script, options) =>
          runJxa(
            composeNativeScript(
              ALWAYS_INSTALLED_BUNDLE_ID,
              "var missing = new Error('No such object.'); missing.errorNumber = -1728; throw missing;",
              {}
            ),
            { timeout: options.timeoutMs }
          ),
      },
    })
    const error = await rejectionOf(executor.execute(request()))
    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Note' })
  })

  it('classifies a process stopped by the time limit as OperationTimeoutError', async () => {
    const context: NativeFailureContext = { app: 'Notes', operation: LIST_ACCOUNTS, timeoutMs: 300 }
    const failure = await rejectionOf(runJxa('while (true) {}', { timeout: 300 }))
    const described = describeNativeFailure(failure, context)
    expect(described).toBeInstanceOf(OperationTimeoutError)
    expect(described.details).toEqual({ timeoutMs: 300 })
  })

  // Regression: a process killed from outside used to be reported as an app
  // failure (and, through Node's killed flag, could pass for a timeout). It is
  // a host failure.
  it('classifies a process killed by a signal macts did not send as InternalError', async () => {
    const failure = await rejectionOf(
      runJxa("ObjC.import('signal'); ObjC.import('unistd'); $.kill($.getpid(), 9);")
    )
    expect(failure).toMatchObject({ kind: 'signalled', timedOut: false })
    const context: NativeFailureContext = {
      app: 'Notes',
      operation: LIST_ACCOUNTS,
      timeoutMs: 30000,
    }
    expect(describeNativeFailure(failure, context)).toBeInstanceOf(InternalError)
  })

  // Regression: overflowing the output buffer also sets Node's killed flag, and
  // used to be reported as OperationTimeoutError.
  it('classifies output beyond the output limit as InternalError, not a timeout', async () => {
    const failure = await rejectionOf(runJxa("return 'x'.repeat(10000);", { maxOutputBytes: 1024 }))
    expect(failure).toMatchObject({ kind: 'output-too-large', timedOut: false })
    const context: NativeFailureContext = {
      app: 'Notes',
      operation: LIST_ACCOUNTS,
      timeoutMs: 30000,
    }
    const described = describeNativeFailure(failure, context)
    expect(described).toBeInstanceOf(InternalError)
    expect(described.message).toContain('output limit')
  })

  it('stops the process when the caller aborts mid-run', async () => {
    const controller = new AbortController()
    const started = Date.now()
    const pending = rejectionOf(
      runJxa('while (true) {}', { timeout: 20000, signal: controller.signal })
    )
    setTimeout(() => {
      controller.abort()
    }, 300)
    const failure = await pending
    expect(failure).toMatchObject({ kind: 'cancelled', timedOut: false })
    // Stopped by the abort, long before the time limit.
    expect(Date.now() - started).toBeLessThan(10000)
  })
})
