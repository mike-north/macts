/**
 * Tests that the reference-resolution route records the caller-supplied app
 * name on its span only once the runtime has authenticated the caller and
 * accepted the app.
 *
 * Spans are inert in `../telemetry.js`, so `withSpan` is replaced with one
 * that records every attribute set on the span it hands out, while still
 * running the callback exactly as the real one does.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D7)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Hono } from 'hono'
import type { AttributeValue, Span, SpanStatusCodeValue } from '../telemetry.js'
import {
  DUNE,
  DUNE_WIRE,
  LIBRARIAN,
  LIBRARIAN_TOKEN,
  LIBRARY_MANIFEST,
  libraryContract,
  wire,
} from './library-fixture.js'
import { createFakeVerifier, createRecordingExecutor, createTestServer } from './test-helpers.js'

/** One attribute set on a span during the current test. */
interface RecordedAttribute {
  readonly span: string
  readonly key: string
  readonly value: AttributeValue
}

/** Every span attribute set during the current test, in order. */
const recorded: RecordedAttribute[] = []

/** A span that records its attributes into {@link recorded}. */
class RecordingSpan implements Span {
  constructor(private readonly name: string) {}
  setAttribute(key: string, value: AttributeValue): this {
    recorded.push({ span: this.name, key, value })
    return this
  }
  setStatus(_status: { code: SpanStatusCodeValue; message?: string }): this {
    return this
  }
  recordException(_exception: Error | string): void {
    // Not observed by these tests.
  }
  end(): void {
    // Not observed by these tests.
  }
}

vi.mock('../telemetry.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../telemetry.js')>()
  return {
    ...original,
    withSpan: <T>(name: string, fn: (span: Span) => Promise<T>): Promise<T> =>
      fn(new RecordingSpan(name)),
  }
})

beforeEach(() => {
  recorded.length = 0
})

/** The server app with the library contract, whose resolutions answer `DUNE_WIRE`. */
function libraryServer(): Hono {
  return createTestServer({
    manifests: [],
    register: (registrar) => {
      registrar.registerContract(libraryContract(), LIBRARY_MANIFEST)
    },
    executor: createRecordingExecutor(undefined, () => Promise.resolve(DUNE_WIRE)),
    verifier: createFakeVerifier({ [LIBRARIAN_TOKEN]: LIBRARIAN }),
  }).app
}

/** POST `body` to the resolution route in process, presenting `token` when given. */
function resolveRequest(app: Hono, body: unknown, token?: string): Promise<Response> {
  return Promise.resolve(
    app.request('/references/v1/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    })
  )
}

describe('the references.resolve span', () => {
  it('records the app once a resolution succeeds', async () => {
    const app = libraryServer()

    const res = await resolveRequest(
      app,
      { app: 'library', reference: wire(DUNE) },
      LIBRARIAN_TOKEN
    )

    expect(res.status).toBe(200)
    expect(recorded).toEqual([
      { span: 'references.resolve', key: 'references.app', value: 'library' },
    ])
  })

  it('never records the app for an unauthenticated caller', async () => {
    const app = libraryServer()

    const res = await resolveRequest(app, { app: 'caller-chosen-value', reference: wire(DUNE) })

    expect(res.status).toBe(401)
    expect(recorded).toEqual([])
  })

  it('never records an app the runtime does not know', async () => {
    const app = libraryServer()

    const res = await resolveRequest(
      app,
      { app: 'caller-chosen-value', reference: wire(DUNE) },
      LIBRARIAN_TOKEN
    )

    expect(res.status).toBe(400)
    expect(recorded).toEqual([])
  })
})
