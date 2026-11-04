/**
 * Tests for the native macOS executor.
 *
 * Most cases inject the transport so they need no automation host. A few run
 * the real host and the real value codec with replaced bodies that send no
 * events to any app, which is safe on the macOS CI runners: constructing an
 * application object triggers no automation-permission prompt, a bundle
 * identifier with no installed app fails before any event is sent, and a host
 * that kills itself touches no app.
 *
 * The failure tables are written by hand from the structured error registry
 * and its classification rules. Reported app failures carry the error number
 * the app or bridge raised inside the automation process; -2700 with
 * "Application can't be found." is the failure observed on macOS 27.2 for an
 * uninstalled bundle identifier. Process failure samples follow the form the
 * host prints for an uncaught error, `execution error: Error: <message>
 * (<number>)`, and for a script that does not compile, `<start>:<end>: syntax
 * error: ... (-2700)`.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D3, D4, D6, D9)
 * @see https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/reference/ASLR_error_codes.html
 */

import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  EMPTY_RESOURCE_PLAN_TABLE,
  AppAuthorizationRequiredError,
  AppOperationError,
  AppUnavailableError,
  InternalError,
  InvalidSelectionError,
  CollectionChangedError,
  MactsError,
  OperationCancelledError,
  OperationTimeoutError,
  PASSTHROUGH_PLAN,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
  type FieldPlan,
  type OperationTarget,
  type ValuePlan,
} from '@macts/contracts'
import type { ExecutionRequest } from '../execution/executor.js'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { JxaExecutionError, runJxa, runNativeScript, type JxaFailureKind } from './executor.js'
import {
  NATIVE_CODEC,
  type NativeFailure,
  type NativeOutcome,
  type NativeScript,
} from './native-codec.js'
import {
  createNativeExecutor,
  describeNativeFailure,
  type NativeFailureContext,
  type NativeRunFailure,
  type NativeRunOptions,
  type NativeTransport,
} from './native-executor.js'
import { buildNativeBody } from './native-scripts.js'

const NOTES_MANIFEST = fileURLToPath(
  new URL('../../../../manifests/notes/app.yaml', import.meta.url)
)

/** A bundle identifier that no installed app has. */
const NOT_INSTALLED_BUNDLE_ID = 'com.example.macts.not-installed'

/** A bundle identifier present on every Mac; constructing it sends no events. */
const ALWAYS_INSTALLED_BUNDLE_ID = 'com.apple.finder'

/** Generous: the first automation-process launch on a cold machine can be slow. */
const HOST_TEST_TIMEOUT_MS = 30000

/** App-supplied text that must never reach a message or details. */
const APP_TEXT = 'APP_TEXT_SENTINEL_d41c'

let notes: AppManifest

beforeAll(async () => {
  notes = await loadManifest(NOTES_MANIFEST)
})

const GET_NOTE: OperationTarget = { command: 'get', resource: 'Note' }
const LIST_ACCOUNTS: OperationTarget = { command: 'list', resource: 'Account' }
/** A list that pages: Notes claims an attachment's id unique. */
const LIST_ATTACHMENTS: OperationTarget = { command: 'list', resource: 'Attachment' }

/** An execution request against Notes with passthrough plans unless overridden. */
function request(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    manifest: notes,
    target: GET_NOTE,
    input: { name: 'Groceries' },
    inputPlan: PASSTHROUGH_PLAN,
    outputPlan: PASSTHROUGH_PLAN,
    resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
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

/** A mock of {@link NativeTransport.run}. */
function mockRun() {
  return vi.fn<(script: NativeScript, options: NativeRunOptions) => Promise<NativeOutcome>>()
}

/** A failed outcome reporting `failure`. */
const failed = (failure: NativeFailure): NativeOutcome => ({ ok: false, failure })

/**
 * A transport that runs the real automation host with the real codec, but
 * replaces the operation's body (and targets an always-installed app), so no
 * event is sent to any app.
 */
function realHostWithBody(body: string): NativeTransport {
  return {
    run: (script, options) =>
      runNativeScript({ ...script, bundleId: ALWAYS_INSTALLED_BUNDLE_ID, body }, NATIVE_CODEC, {
        timeout: options.timeoutMs,
        signal: options.signal,
      }),
  }
}

const STRING_PLAN: ValuePlan = { kind: 'string' }
const INTEGER_PLAN: ValuePlan = { kind: 'integer' }
const required = (value: ValuePlan): FieldPlan => ({ value, presence: 'required' })

describe('createNativeExecutor', () => {
  it('identifies the macOS provider', () => {
    expect(createNativeExecutor().provider).toBe('macos')
  })

  describe('script building', () => {
    it('passes the native script and the time limit to the transport', async () => {
      const run = mockRun().mockResolvedValue({ ok: true, value: { name: 'Groceries' } })
      const executor = createNativeExecutor({ transport: { run }, timeoutMs: 1234 })

      const result = await executor.execute(request())

      expect(result).toEqual({ name: 'Groceries' })
      expect(run).toHaveBeenCalledTimes(1)
      expect(run).toHaveBeenCalledWith(
        {
          bundleId: 'com.apple.Notes',
          body: buildNativeBody(notes, GET_NOTE),
          input: { name: 'Groceries' },
          inputPlan: PASSTHROUGH_PLAN,
          outputPlan: PASSTHROUGH_PLAN,
          references: {},
        },
        { timeoutMs: 1234 }
      )
    })

    describe('reference table', () => {
      const CONTACTS_MANIFEST = fileURLToPath(
        new URL('../../../../manifests/contacts/app.yaml', import.meta.url)
      )
      const MUSIC_MANIFEST = fileURLToPath(
        new URL('../../../../manifests/music/app.yaml', import.meta.url)
      )
      const STRING_ID = { id: { kind: 'string' } } as const
      const reference = (resource: string): ValuePlan => ({
        kind: 'reference',
        resource,
        cardinality: 'one',
      })

      /** The `references` of the script the executor builds for `overrides`. */
      async function scriptReferences(
        overrides: Partial<ExecutionRequest>
      ): Promise<NativeScript['references']> {
        const run = mockRun().mockResolvedValue({ ok: true, value: null })
        await createNativeExecutor({ transport: { run } }).execute(request(overrides))
        const script = run.mock.calls[0]?.[0]
        if (script === undefined) throw new Error('No script was run')
        return script.references
      }

      it('merges the identifier plan with how the app finds the object, for each referenced resource only', async () => {
        // Contacts: a person is found by id in the app's people (manifest
        // identifier `id`, default targeting); an email is found by id within
        // its person (its get records the person as parent).
        const contacts = await loadManifest(CONTACTS_MANIFEST)
        const references = await scriptReferences({
          manifest: contacts,
          target: { command: 'actionTitle' },
          input: { with: 'phone', for: 'p-1' },
          inputPlan: { kind: 'record', fields: { for: required(reference('Person')) } },
          outputPlan: { kind: 'array', items: reference('Email') },
          resourcePlans: { Person: STRING_ID, Email: STRING_ID, Group: STRING_ID },
        })
        expect(references).toEqual({
          Person: {
            id: { kind: 'string' },
            addressing: { collection: 'people', lookup: 'byId', property: 'id' },
          },
          Email: {
            id: { kind: 'string' },
            addressing: { collection: 'emails', lookup: 'byId', property: 'id', within: 'Person' },
          },
        })
      })

      it('carries the parent a resource is found within, though no plan names it', async () => {
        const contacts = await loadManifest(CONTACTS_MANIFEST)
        const references = await scriptReferences({
          manifest: contacts,
          target: { command: 'actionTitle' },
          input: { with: 'phone', for: 'p-1' },
          inputPlan: PASSTHROUGH_PLAN,
          outputPlan: reference('Email'),
          resourcePlans: { Person: STRING_ID, Email: STRING_ID },
        })
        expect(Object.keys(references).sort()).toEqual(['Email', 'Person'])
        expect(references['Person']).toEqual({
          id: { kind: 'string' },
          addressing: { collection: 'people', lookup: 'byId', property: 'id' },
        })
      })

      it('matches by property for a resource targeted by property, within its parent too', async () => {
        // Music: playlists and tracks are both matched on `persistentID`
        // (`targeting: byProperty`); a track's get records its playlist.
        const music = await loadManifest(MUSIC_MANIFEST)
        const references = await scriptReferences({
          manifest: music,
          target: { command: 'listPlaylists', resource: 'Playlist' },
          input: {},
          inputPlan: PASSTHROUGH_PLAN,
          outputPlan: {
            kind: 'record',
            fields: {
              playlist: required({ kind: 'nullable', value: reference('Playlist') }),
              track: required(reference('Track')),
            },
          },
          resourcePlans: { Playlist: STRING_ID, Track: STRING_ID },
        })
        expect(references).toEqual({
          Playlist: {
            id: { kind: 'string' },
            addressing: { collection: 'playlists', lookup: 'byProperty', property: 'persistentID' },
          },
          Track: {
            id: { kind: 'string' },
            addressing: {
              collection: 'tracks',
              lookup: 'byProperty',
              property: 'persistentID',
              within: 'Playlist',
            },
          },
        })
      })

      it('gives no entry to a resource the request has no plans for', async () => {
        // An app registered without a contract passes an empty table, so no
        // reference converts.
        const references = await scriptReferences({
          inputPlan: { kind: 'record', fields: { note: required(reference('Note')) } },
          resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
        })
        expect(references).toEqual({})
      })

      it('carries an empty table when the plans hold no reference, whatever the request lists', async () => {
        const references = await scriptReferences({
          resourcePlans: { Note: STRING_ID, Folder: STRING_ID },
        })
        expect(references).toEqual({})
      })

      it('also carries a resource that another resource identifier refers to', async () => {
        // Notes notes are found by name; a hypothetical identifier that is a
        // folder reference makes the folder reachable too.
        const references = await scriptReferences({
          inputPlan: { kind: 'record', fields: { note: required(reference('Note')) } },
          resourcePlans: { Note: { id: reference('Folder') }, Folder: STRING_ID },
        })
        expect(Object.keys(references).sort()).toEqual(['Folder', 'Note'])
        expect(references['Note']).toEqual({
          id: reference('Folder'),
          addressing: { collection: 'notes', lookup: 'byId', property: 'name' },
        })
      })
    })

    it('adds the legacy identifier aliases to list items only for passthrough output', async () => {
      // Calendar calendars have no `id` field of their own, so a passthrough
      // list mirrors their working identifier (`name`) under `id`. (A Notes
      // account has its own `id`, which the alias never overwrites.)
      const calendar = await loadManifest(
        fileURLToPath(new URL('../../../../manifests/calendar/app.yaml', import.meta.url))
      )
      const listCalendars: OperationTarget = { command: 'list', resource: 'Calendar' }
      const run = mockRun().mockResolvedValue({ ok: true, value: [] })
      const executor = createNativeExecutor({ transport: { run } })
      const typedOutput: ValuePlan = { kind: 'array', items: { kind: 'unknown' } }

      const listRequest = { manifest: calendar, target: listCalendars, input: {} }
      await executor.execute(request(listRequest))
      await executor.execute(request({ ...listRequest, outputPlan: typedOutput }))

      const [passthrough, typed] = run.mock.calls.map(([script]) => script.body)
      expect(passthrough).toBe(
        buildNativeBody(calendar, listCalendars, { identifierAliases: true })
      )
      expect(typed).toBe(buildNativeBody(calendar, listCalendars, { identifierAliases: false }))
      expect(passthrough).toContain('obj["id"] = obj["name"];')
      expect(typed).not.toContain('obj["id"] =')
    })

    it('reads a page window with the paged list body, encoding items by the item plan and the window facts as plain data', async () => {
      const window = { items: [], length: 0 }
      const run = mockRun().mockResolvedValue({ ok: true, value: window })
      const itemsPlan: ValuePlan = { kind: 'array', items: { kind: 'unknown' } }
      const page = { offset: 25, size: 25, anchor: 'A-25' }
      const result = await createNativeExecutor({ transport: { run } }).execute(
        request({ target: LIST_ATTACHMENTS, input: {}, outputPlan: itemsPlan, page })
      )
      expect(result).toEqual(window)
      const [script] = run.mock.calls[0] ?? []
      expect(script?.body).toBe(buildNativeBody(notes, LIST_ATTACHMENTS, { paged: true }))
      expect(script?.page).toEqual(page)
      expect(script?.outputPlan).toEqual({
        kind: 'record',
        fields: {
          items: { presence: 'required', value: itemsPlan },
          length: { presence: 'required', value: PASSTHROUGH_PLAN },
          last: { presence: 'optional', value: PASSTHROUGH_PLAN },
        },
      })
    })

    it('refuses a page window for an operation that is not a list, before running', async () => {
      const run = mockRun()
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(
          request({ page: { offset: 0, size: 25 } })
        )
      )
      expect(error).toBeInstanceOf(InternalError)
      expect(run).not.toHaveBeenCalled()
    })

    it('executes operations whose plans are not passthrough, passing the plans through', async () => {
      const inputPlan: ValuePlan = {
        kind: 'record',
        fields: { name: required(STRING_PLAN), limit: required(INTEGER_PLAN) },
      }
      const run = mockRun().mockResolvedValue({ ok: true, value: { integer: '7' } })
      const result = await createNativeExecutor({ transport: { run } }).execute(
        request({
          input: { name: 'Groceries', limit: { integer: '3' } },
          inputPlan,
          outputPlan: INTEGER_PLAN,
          resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
        })
      )
      expect(result).toEqual({ integer: '7' })
      const [script] = run.mock.calls[0] ?? []
      expect(script?.inputPlan).toBe(inputPlan)
      expect(script?.outputPlan).toBe(INTEGER_PLAN)
      expect(script?.input).toEqual({ name: 'Groceries', limit: { integer: '3' } })
    })

    it('defaults the time limit to 30000 ms', async () => {
      const run = mockRun().mockResolvedValue({ ok: true, value: null })
      await createNativeExecutor({ transport: { run } }).execute(request())
      expect(run).toHaveBeenCalledWith(expect.anything(), { timeoutMs: 30000 })
    })

    it('writes no input value into the body', async () => {
      const run = mockRun().mockResolvedValue({ ok: true, value: null })
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

      const [script] = run.mock.calls[0] ?? []
      expect(script?.input).toEqual(input)
      for (const sentinel of Object.values(input)) {
        expect(script?.body).not.toContain(sentinel)
      }
    })

    it('returns null when the outcome carries no value', async () => {
      const run = vi.fn().mockResolvedValue({ ok: true, value: undefined })
      expect(await createNativeExecutor({ transport: { run } }).execute(request())).toBeNull()
    })

    it('refuses an outcome value that is not JSON with InternalError', async () => {
      const run = vi.fn().mockResolvedValue({ ok: true, value: { when: new Date(0) } })
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(InternalError)
    })

    // Regression: the message for a result that is not JSON is shared with
    // resolution, and must name what produced it in each case.
    it.each([
      ['NaN', Number.NaN],
      ['a function', () => undefined],
    ])(
      'refuses %s as an operation result with InternalError naming the operation',
      async (_label, value) => {
        const run = vi.fn().mockResolvedValue({ ok: true, value })
        const error = await rejectionOf(
          createNativeExecutor({ transport: { run } }).execute(request())
        )
        expect(error).toBeInstanceOf(InternalError)
        if (!(error instanceof InternalError)) return
        expect(error.message).toBe('The operation produced a result that is not valid JSON.')
      }
    )

    it('rejects input missing a required parameter with ValidationError, without running', async () => {
      const run = mockRun()
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request({ input: {} }))
      )
      expect(error).toBeInstanceOf(ValidationError)
      expect(run).not.toHaveBeenCalled()
    })

    it('fails with InternalError when the target names no manifest command', async () => {
      const run = mockRun()
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
      const run = mockRun()
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
      let finish: (outcome: NativeOutcome) => void = () => undefined
      const run = mockRun().mockImplementation(
        () =>
          new Promise<NativeOutcome>((resolve) => {
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
      finish({ ok: true, value: { late: true } })
      expect(error).toBeInstanceOf(OperationCancelledError)
    })

    it('hands the caller signal to the transport, so a mid-run abort stops the script', async () => {
      const controller = new AbortController()
      const run = mockRun().mockResolvedValue({ ok: true, value: null })
      await createNativeExecutor({ transport: { run } }).execute(
        request({ signal: controller.signal })
      )
      expect(run.mock.calls[0]?.[1].signal).toBe(controller.signal)
    })

    it('reports a run failure after an abort as a cancellation', async () => {
      const controller = new AbortController()
      const run = mockRun().mockImplementation(() => {
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
    it('classifies a reported app failure and keeps its text only as cause', async () => {
      const run = mockRun().mockResolvedValue(
        failed({ source: 'app', message: APP_TEXT, errorNumber: -1728 })
      )
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(TargetNotFoundError)
      if (!(error instanceof TargetNotFoundError)) return
      expect(error.details).toEqual({ resource: 'Note' })
      expect(error.message).not.toContain(APP_TEXT)
      expect(JSON.stringify(error)).not.toContain(APP_TEXT)
      expect(error.cause).toBeInstanceOf(Error)
      expect(error.cause instanceof Error && error.cause.message).toBe(APP_TEXT)
    })

    it('reports a codec encode failure as UnexpectedValueError with its issue', async () => {
      const run = mockRun().mockResolvedValue(
        failed({
          source: 'codec',
          direction: 'encode',
          path: ['items', 2, 'count'],
          message: 'Expected an integer',
        })
      )
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request({ outputPlan: INTEGER_PLAN }))
      )
      expect(error).toBeInstanceOf(UnexpectedValueError)
      if (!(error instanceof UnexpectedValueError)) return
      expect(error.details).toEqual({
        issues: [{ path: ['items', 2, 'count'], message: 'Expected an integer' }],
      })
      expect(error.message).toContain('Notes')
    })

    it('reports a changed collection as CollectionChangedError with no details and none of the reported text', async () => {
      const run = mockRun().mockResolvedValue(failed({ source: 'collection', message: APP_TEXT }))
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(
          request({ target: LIST_ACCOUNTS, input: {} })
        )
      )
      expect(error).toBeInstanceOf(CollectionChangedError)
      if (!(error instanceof CollectionChangedError)) return
      expect(error.details).toEqual({})
      expect(error.message).toContain('Notes')
      expect(error.message).not.toContain(APP_TEXT)
    })

    it('reports a codec decode failure as ValidationError with its issue', async () => {
      const run = mockRun().mockResolvedValue(
        failed({ source: 'codec', direction: 'decode', path: ['limit'], message: 'Bad integer' })
      )
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(ValidationError)
      if (!(error instanceof ValidationError)) return
      expect(error.details).toEqual({ issues: [{ path: ['limit'], message: 'Bad integer' }] })
    })

    // Regression: a value kind the codec cannot convert (a reference input) was
    // reported as ValidationError, blaming a caller whose input was valid.
    it.each([
      ['decode', 'takes'],
      ['encode', 'returns'],
    ] as const)(
      'reports a codec %s failure for an unsupported kind as InternalError',
      async (direction, verb) => {
        const run = mockRun().mockResolvedValue(
          failed({
            source: 'codec',
            direction,
            path: ['for'],
            message: 'Reference values have no conversion in this codec',
            unsupportedKind: 'reference',
          })
        )
        const error = await rejectionOf(
          createNativeExecutor({ transport: { run } }).execute(request())
        )
        expect(error).toBeInstanceOf(InternalError)
        if (!(error instanceof InternalError)) return
        expect(error.message).toBe(
          `The Notes operation "Note get" ${verb} a reference at \`for\` that the macOS provider cannot convert yet.`
        )
        expect(error.details).toEqual({})
        expect(error.cause).toBeInstanceOf(Error)
        expect(error.cause).toMatchObject({
          message: 'Reference values have no conversion in this codec',
          path: ['for'],
        })
      }
    )

    it('names a file kind the codec cannot convert by its kind', async () => {
      const run = mockRun().mockResolvedValue(
        failed({
          source: 'codec',
          direction: 'encode',
          path: ['attachment'],
          message: 'File values have no conversion in this codec',
          unsupportedKind: 'file',
        })
      )
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).toBe(
        'The Notes operation "Note get" returns file values at `attachment`, which the macOS provider does not support yet.'
      )
    })

    it('reports a referenced object the app does not have as a missing target of that resource', async () => {
      // The operation's own resource is Note; the missing object is the
      // person the input referenced, so the error names Person.
      const run = mockRun().mockResolvedValue(
        failed({
          source: 'codec',
          direction: 'decode',
          path: ['for'],
          message: `The app has no "Person" with this identifier ${APP_TEXT}`,
          missingResource: 'Person',
        })
      )
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(TargetNotFoundError)
      if (!(error instanceof TargetNotFoundError)) return
      expect(error.message).toBe('Notes has no Person matching the reference at `for`.')
      expect(error.details).toEqual({ resource: 'Person' })
      expect(error.message).not.toContain(APP_TEXT)
      expect(error.cause).toMatchObject({ path: ['for'] })
    })

    it('classifies a process failure and keeps the raw failure only as cause', async () => {
      const failure = processFailure("execution error: Error: Error: Can't get object. (-1728)")
      const run = mockRun().mockRejectedValue(failure)
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(TargetNotFoundError)
      if (!(error instanceof TargetNotFoundError)) return
      expect(error.details).toEqual({ resource: 'Note' })
      expect(error.cause).toBe(failure)
    })

    it('classifies a synchronous throw from the transport as InternalError', async () => {
      const run = mockRun().mockImplementation(() => {
        throw new Error('spawn failed')
      })
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).execute(request())
      )
      expect(error).toBeInstanceOf(InternalError)
    })
  })

  // Resolution within the native conversion scope is covered in
  // native-resolution.test.ts.
  describe('reference resolution', () => {
    it('fails a selector reference with InternalError and runs no automation', async () => {
      const run = mockRun()
      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).resolve({
          manifest: notes,
          reference: {
            resource: 'Note',
            form: 'selector',
            cardinality: 'one',
            selector: { by: 'name', name: 'Groceries' },
          },
          outputPlan: PASSTHROUGH_PLAN,
          resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
        })
      )
      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).toBe(
        'The macOS provider cannot resolve a selector reference to the Notes resource "Note" yet.'
      )
      expect(error.details).toEqual({})
      expect(run).not.toHaveBeenCalled()
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

  const reported = (failure: NativeFailure): NativeRunFailure => ({ kind: 'reported', failure })
  const app = (errorNumber?: number, message = APP_TEXT): NativeRunFailure =>
    reported(
      errorNumber === undefined
        ? { source: 'app', message }
        : { source: 'app', message, errorNumber }
    )
  const rejected = (error: unknown): NativeRunFailure => ({ kind: 'process', error })

  /** Host output for an uncaught error with `message` and `number`. */
  const stderr = (message: string, number: number): string =>
    `execution error: Error: Error: ${message} (${String(number)})\n`

  interface Case {
    readonly name: string
    readonly failure: NativeRunFailure
    readonly context?: NativeFailureContext
    readonly type: abstract new (...args: never[]) => MactsError
    readonly details: unknown
  }

  const reportedCases: readonly Case[] = [
    {
      name: 'app -1728 (no such object)',
      failure: app(-1728),
      type: TargetNotFoundError,
      details: { resource: 'Note' },
    },
    {
      // A scoped operation's parent check names the parent it found missing,
      // so the error names the parent, not the operation's resource.
      name: 'app -1728 naming the missing parent',
      failure: reported({
        source: 'app',
        message: APP_TEXT,
        errorNumber: -1728,
        missingResource: 'Account',
      }),
      type: TargetNotFoundError,
      details: { resource: 'Account' },
    },
    {
      name: 'app -1728 for an app-level command (no resource)',
      failure: app(-1728),
      context: appContext,
      type: TargetNotFoundError,
      details: {},
    },
    {
      name: 'app -1719 (invalid index)',
      failure: app(-1719),
      type: InvalidSelectionError,
      details: { resource: 'Note' },
    },
    {
      name: 'app -1743 (not authorized)',
      failure: app(-1743),
      type: AppAuthorizationRequiredError,
      details: { app: 'Notes' },
    },
    {
      name: 'app -600 (not running)',
      failure: app(-600),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-responding' },
    },
    {
      name: 'app -609 (connection invalid)',
      failure: app(-609),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-responding' },
    },
    {
      name: 'app -2700 with "Application can\'t be found." (observed on macOS 27.2)',
      failure: app(-2700, "Application can't be found."),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-installed' },
    },
    {
      name: 'app -2700 with a typographic apostrophe',
      failure: app(-2700, 'Application can’t be found.'),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-installed' },
    },
    {
      name: 'app -2700 with any other text',
      failure: app(-2700),
      type: AppOperationError,
      details: { app: 'Notes', appErrorCode: -2700 },
    },
    {
      name: 'app -10814 (app not found)',
      failure: app(-10814),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-installed' },
    },
    {
      // The app's own event timeout, not the executor's limit: no elapsed time
      // is claimed.
      name: 'app -1712 (the app did not answer in time)',
      failure: app(-1712),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-responding' },
    },
    {
      name: 'app, any other number',
      failure: app(-10024),
      type: AppOperationError,
      details: { app: 'Notes', appErrorCode: -10024 },
    },
    {
      name: 'app, a positive number',
      failure: app(3),
      type: AppOperationError,
      details: { app: 'Notes', appErrorCode: 3 },
    },
    {
      name: 'app, no number',
      failure: app(),
      type: AppOperationError,
      details: { app: 'Notes' },
    },
    {
      name: 'codec encode',
      failure: reported({
        source: 'codec',
        direction: 'encode',
        path: ['events', 1, 'status'],
        message: 'Expected one of "confirmed"',
      }),
      type: UnexpectedValueError,
      details: {
        issues: [{ path: ['events', 1, 'status'], message: 'Expected one of "confirmed"' }],
      },
    },
    {
      name: 'codec encode at the value itself',
      failure: reported({
        source: 'codec',
        direction: 'encode',
        path: [],
        message: 'Expected an object',
      }),
      type: UnexpectedValueError,
      details: { issues: [{ path: [], message: 'Expected an object' }] },
    },
    {
      name: 'codec decode',
      failure: reported({
        source: 'codec',
        direction: 'decode',
        path: ['count'],
        message: 'Bad integer',
      }),
      type: ValidationError,
      details: { issues: [{ path: ['count'], message: 'Bad integer' }] },
    },
    {
      // The input's plan has a kind the codec cannot convert: macts's fault.
      name: 'codec decode of an unsupported kind',
      failure: reported({
        source: 'codec',
        direction: 'decode',
        path: ['attachments', 0],
        message: 'File values have no conversion in this codec',
        unsupportedKind: 'file',
      }),
      type: InternalError,
      details: {},
    },
    {
      // The result's plan has a kind the codec cannot convert: not the app's fault.
      name: 'codec encode of an unsupported kind',
      failure: reported({
        source: 'codec',
        direction: 'encode',
        path: [],
        message: 'File source values have no conversion in this codec',
        unsupportedKind: 'file-source',
      }),
      type: InternalError,
      details: {},
    },
  ]

  const processCases: readonly Case[] = [
    {
      name: 'a process stopped by its own time limit',
      failure: rejected(processFailure('', 'timed-out')),
      type: OperationTimeoutError,
      details: { timeoutMs: 30000 },
    },
    {
      name: 'a timed-out process, even with a classifiable number in its output',
      failure: rejected(processFailure(stderr("Can't get object.", -1728), 'timed-out')),
      type: OperationTimeoutError,
      details: { timeoutMs: 30000 },
    },
    {
      name: 'a process stopped by the caller',
      failure: rejected(processFailure('', 'cancelled')),
      type: OperationCancelledError,
      details: {},
    },
    {
      // Node also reports this as a killed process; it is not a timeout.
      name: 'output beyond the output limit',
      failure: rejected(processFailure('', 'output-too-large')),
      type: InternalError,
      details: {},
    },
    {
      name: 'a host that could not be started',
      failure: rejected(processFailure('', 'not-started')),
      type: InternalError,
      details: {},
    },
    {
      name: 'a process killed by a signal the transport did not send',
      failure: rejected(processFailure('', 'signalled')),
      type: InternalError,
      details: {},
    },
    {
      name: 'a plain error with a killed flag (not a transport failure)',
      failure: rejected(Object.assign(new Error('x'), { killed: true, signal: 'SIGTERM' })),
      type: InternalError,
      details: {},
    },
    {
      name: 'a script that did not compile',
      failure: rejected(
        processFailure(
          "0:38: syntax error: Error on line 1: SyntaxError: Unexpected token ';' (-2700)\n"
        )
      ),
      type: InternalError,
      details: {},
    },
    {
      name: 'a malformed outcome',
      failure: rejected(processFailure(stderr('x', -1728), 'unreadable-output')),
      type: InternalError,
      details: {},
    },
    {
      name: 'stderr ending in -1728',
      failure: rejected(processFailure(stderr("Can't get object.", -1728))),
      type: TargetNotFoundError,
      details: { resource: 'Note' },
    },
    {
      name: 'stderr ending in -1743',
      failure: rejected(
        processFailure(stderr('Not authorized to send Apple events to Notes.', -1743))
      ),
      type: AppAuthorizationRequiredError,
      details: { app: 'Notes' },
    },
    {
      name: 'stderr ending in -2700 "Application can\'t be found."',
      failure: rejected(processFailure(stderr("Application can't be found.", -2700))),
      type: AppUnavailableError,
      details: { app: 'Notes', reason: 'not-installed' },
    },
    {
      name: 'stderr ending in -2700 with any other text',
      failure: rejected(processFailure(stderr(APP_TEXT, -2700))),
      type: AppOperationError,
      details: { app: 'Notes', appErrorCode: -2700 },
    },
    {
      name: 'stderr ending in any other number',
      failure: rejected(processFailure(stderr(APP_TEXT, -10024))),
      type: AppOperationError,
      details: { app: 'Notes', appErrorCode: -10024 },
    },
    {
      name: 'a plain error carrying stderr (not a transport failure)',
      failure: rejected(
        Object.assign(new Error('x'), { stderr: stderr("Can't get object.", -1728) })
      ),
      type: InternalError,
      details: {},
    },
    {
      name: 'stderr with no number',
      failure: rejected(processFailure(`execution error: ${APP_TEXT}\n`)),
      type: InternalError,
      details: {},
    },
    {
      name: 'a number in the middle of the output, not at its end',
      failure: rejected(processFailure('execution error: Error (-1728) happened\n')),
      type: InternalError,
      details: {},
    },
    {
      name: 'a failure with no output at all',
      failure: rejected(new Error('spawn osascript ENOENT')),
      type: InternalError,
      details: {},
    },
    {
      name: 'a non-error value',
      failure: rejected('boom'),
      type: InternalError,
      details: {},
    },
  ]

  const cases = [...reportedCases, ...processCases]

  it.each(cases)('$name', ({ failure, context: override, type, details }) => {
    const described = describeNativeFailure(failure, override ?? context)
    expect(described).toBeInstanceOf(type)
    expect(described.details).toEqual(details)
  })

  it.each(processCases)(
    '$name: keeps the process failure as cause',
    ({ failure, context: override }) => {
      if (failure.kind !== 'process') return
      expect(describeNativeFailure(failure, override ?? context).cause).toBe(failure.error)
    }
  )

  it.each(
    reportedCases.filter((c) => c.failure.kind === 'reported' && c.failure.failure.source === 'app')
  )('$name: keeps the app text only as cause', ({ failure, context: override }) => {
    if (failure.kind !== 'reported') return
    const described = describeNativeFailure(failure, override ?? context)
    expect(described.cause).toBeInstanceOf(Error)
    expect(described.cause instanceof Error && described.cause.message).toBe(
      failure.failure.message
    )
  })

  it.each(cases)(
    '$name: message uses consumer vocabulary only',
    ({ failure, context: override }) => {
      const described = describeNativeFailure(failure, override ?? context)
      expect(described.message).not.toMatch(/AppleScript|JXA|AppleEvent|osascript|OSA/i)
      expect(described.message).not.toContain('execution error')
      expect(described.message).not.toContain('syntax error')
      expect(JSON.stringify(described.details)).not.toContain('execution error')
    }
  )

  it.each(cases)(
    '$name: no app text in message or serialized error',
    ({ failure, context: override }) => {
      const described = describeNativeFailure(failure, override ?? context)
      expect(described.message).not.toContain(APP_TEXT)
      expect(JSON.stringify(described)).not.toContain(APP_TEXT)
    }
  )

  it('names the app and resource in a not-found message', () => {
    const described = describeNativeFailure(app(-1728), context)
    expect(described.message).toContain('Notes')
    expect(described.message).toContain('Note')
  })

  it('names the missing parent, not the operation resource, in its not-found message', () => {
    const described = describeNativeFailure(
      reported({
        source: 'app',
        message: APP_TEXT,
        errorNumber: -1728,
        missingResource: 'Account',
      }),
      context
    )
    expect(described.message).toBe('Notes has no Account matching the request.')
  })

  it('suggests a pending permission prompt for a timeout', () => {
    const described = describeNativeFailure(rejected(processFailure('', 'timed-out')), context)
    expect(described.message).toContain('permission prompt')
    expect(described.message).toContain('30000 ms')
  })
})

describe('against the real automation host (no app events)', () => {
  it(
    'converts values through the contract for a non-passthrough operation',
    async () => {
      // D3: integers travel as canonical decimal text; the body sees a number.
      const executor = createNativeExecutor({
        transport: realHostWithBody(
          "if (typeof args.limit !== 'number') throw new Error('not decoded'); return args.limit + 1;"
        ),
      })
      const result = await executor.execute(
        request({
          input: { name: 'Groceries', limit: { integer: '41' } },
          inputPlan: {
            kind: 'record',
            fields: { name: required(STRING_PLAN), limit: required(INTEGER_PLAN) },
          },
          outputPlan: INTEGER_PLAN,
          resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
        })
      )
      expect(result).toEqual({ integer: '42' })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports a result that violates the output plan as UnexpectedValueError',
    async () => {
      const executor = createNativeExecutor({ transport: realHostWithBody("return 'x';") })
      const error = await rejectionOf(executor.execute(request({ outputPlan: INTEGER_PLAN })))
      expect(error).toBeInstanceOf(UnexpectedValueError)
      if (!(error instanceof UnexpectedValueError)) return
      expect(error.details.issues.map((issue) => issue.path)).toEqual([[]])
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports an app that is not installed as AppUnavailableError (not-installed)',
    async () => {
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
      expect(error.cause instanceof Error && error.cause.message).toBe(
        "Application can't be found."
      )
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'classifies a missing target raised by a body as TargetNotFoundError',
    async () => {
      // The failure a get body raises when its item does not exist, reported
      // through the outcome by the real host.
      const executor = createNativeExecutor({
        transport: realHostWithBody(
          "var missing = new Error('No such object.'); missing.errorNumber = -1728; throw missing;"
        ),
      })
      const error = await rejectionOf(executor.execute(request()))
      expect(error).toBeInstanceOf(TargetNotFoundError)
      if (!(error instanceof TargetNotFoundError)) return
      expect(error.details).toEqual({ resource: 'Note' })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports a body that does not compile as InternalError',
    async () => {
      const executor = createNativeExecutor({ transport: realHostWithBody('return 1 +;') })
      const error = await rejectionOf(executor.execute(request()))
      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.cause).toBeInstanceOf(JxaExecutionError)
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'classifies a process stopped by the time limit as OperationTimeoutError',
    async () => {
      const executor = createNativeExecutor({
        transport: realHostWithBody('while (true) {}'),
        timeoutMs: 300,
      })
      const error = await rejectionOf(executor.execute(request()))
      expect(error).toBeInstanceOf(OperationTimeoutError)
      if (!(error instanceof OperationTimeoutError)) return
      expect(error.details).toEqual({ timeoutMs: 300 })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'classifies a process killed by another signal as InternalError, not a timeout',
    async () => {
      // SIGKILL delivered from outside the transport's timer, as an
      // out-of-memory kill or an external `kill -9` would deliver it.
      const executor = createNativeExecutor({
        transport: realHostWithBody("ObjC.import('signal'); $.raise(9); return 1;"),
        timeoutMs: 20000,
      })
      const error = await rejectionOf(executor.execute(request()))
      expect(error).toBeInstanceOf(InternalError)
    },
    HOST_TEST_TIMEOUT_MS
  )
  // Regression: overflowing the output buffer also sets Node's killed flag, and
  // used to be reported as OperationTimeoutError.
  it(
    'classifies output beyond the output limit as InternalError, not a timeout',
    async () => {
      const failure = await rejectionOf(
        runJxa("return 'x'.repeat(10000);", { maxOutputBytes: 1024 })
      )
      expect(failure).toMatchObject({ kind: 'output-too-large', timedOut: false })
      const context: NativeFailureContext = {
        app: 'Notes',
        operation: LIST_ACCOUNTS,
        timeoutMs: 30000,
      }
      const described = describeNativeFailure({ kind: 'process', error: failure }, context)
      expect(described).toBeInstanceOf(InternalError)
      expect(described.message).toContain('output limit')
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'stops the process when the caller aborts mid-run',
    async () => {
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
    },
    HOST_TEST_TIMEOUT_MS
  )
})
