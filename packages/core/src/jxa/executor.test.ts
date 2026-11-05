/**
 * Tests for the automation-host process boundary: raw script execution
 * (`runJxa`, `runWithApp`) and native invocations composed with the value codec
 * (`runNativeScript`).
 *
 * Every case runs the real automation host. None sends an event to any app:
 * constructing an application object for an installed app sends nothing and
 * raises no permission prompt, and a bundle identifier with no installed app
 * fails before anything is sent (`runWithApp` cases excepted, which read
 * Calendar's name). Expected values are written by hand from the wire encoding
 * and the native script contract.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D3, D4)
 */

import { describe, it, expect } from 'vitest'
import { PASSTHROUGH_PLAN, type FieldPlan, type ValuePlan, type WireRecord } from '@macts/contracts'
import {
  composeNativeScript,
  runJxa,
  runNativeScript,
  runWithApp,
  JxaExecutionError,
} from './executor.js'
import {
  NATIVE_CODEC,
  NATIVE_READING_KEY,
  type NativeCodec,
  type NativeReferenceTable,
  type NativeScript,
} from './native-codec.js'

describe('runJxa', () => {
  it('should execute simple JXA code', async () => {
    const result = await runJxa<number>('return 1 + 1;')
    expect(result).toBe(2)
  })

  it('should return string results', async () => {
    const result = await runJxa<string>('return "hello";')
    expect(result).toBe('hello')
  })

  it('should return array results', async () => {
    const result = await runJxa<number[]>('return [1, 2, 3];')
    expect(result).toEqual([1, 2, 3])
  })

  it('should return object results', async () => {
    const result = await runJxa<{ foo: string }>('return { foo: "bar" };')
    expect(result).toEqual({ foo: 'bar' })
  })

  it('should handle undefined results', async () => {
    // Await separately to avoid confusing-void-expression error
    await runJxa<undefined>('return undefined;')
    // If we reach here without error, the test passes
    expect(true).toBe(true)
  })

  it('should throw JxaExecutionError for invalid code', async () => {
    await expect(runJxa('invalid syntax !!!')).rejects.toThrow(JxaExecutionError)
  })

  it('should include error details in JxaExecutionError', async () => {
    try {
      await runJxa('throw new Error("test error");')
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(JxaExecutionError)
      const jxaError = error as JxaExecutionError
      expect(jxaError.code).toBeTruthy()
      expect(jxaError.stderr).toBeDefined()
    }
  })

  // Regression test for issue #17: the original test used a 1ms timeout on
  // `return 42;` and raced the wall clock — on a fast/warm machine the script
  // could complete before the timer, resolving instead of rejecting. Fix:
  // drive a script that *intentionally* runs longer than the timeout (JXA
  // `delay(2)` ≈ 2 s) with a 100 ms timeout so the timer always fires first.
  it('should handle timeout option', async () => {
    let thrownError: unknown
    try {
      // delay(2) sleeps for ~2 seconds; the 100 ms timeout fires well before
      // the script can finish, guaranteeing the timeout path wins every time.
      await runJxa('delay(2);', { timeout: 100 })
    } catch (err) {
      thrownError = err
    }

    // Must throw a JxaExecutionError (not a bare Error or some other type).
    expect(thrownError).toBeInstanceOf(JxaExecutionError)
    const jxaErr = thrownError as JxaExecutionError

    // The subprocess is killed by the timeout, so `cause.killed` is true.
    // This is the specific signal that the *timeout* mechanism fired (not a
    // script syntax error, a missing osascript binary, etc.).
    expect((jxaErr.cause as { killed?: boolean } | undefined)?.killed).toBe(true)
    // The transport records that its own time limit stopped the process.
    expect(jxaErr.timedOut).toBe(true)
  }, 10000)

  it('does not report a script error as a timeout', async () => {
    const error = await rejectionOf(runJxa('throw new Error("test error");'))
    expect(error).toBeInstanceOf(JxaExecutionError)
    expect(error instanceof JxaExecutionError && error.timedOut).toBe(false)
  })
})

// Regression: script text must reach the automation process exactly as
// composed. It previously passed through a shell whose quoting rewrote some
// escape sequences, so embedded values containing quotes, backslashes, or
// newlines could arrive altered. Every value must arrive byte for byte.
describe('runJxa passes script text verbatim', () => {
  const payloads: readonly string[] = [
    'a"+"b',
    '\\',
    'back\\slash \\" quote',
    "single ' quote",
    "$'ansi' quoting",
    '$(echo subshell) and `backticks`',
    'line\nbreak and\ttab',
    '\\x27 and \\u0022 escapes',
    'unicode: café ✓ \u2028 separator',
  ]

  it.each(payloads)('round-trips %j unchanged', async (value) => {
    const result = await runJxa<string>(`var v = ${JSON.stringify(value)}; return v;`)
    expect(result).toBe(value)
  })
})

describe('runJxa with a script larger than the pipe buffer', () => {
  // Regression: a process that exits before reading all of stdin made the
  // pending write fail with EPIPE, which had no listener and crashed the host
  // process. The call must reject normally instead.
  it('rejects without crashing when the process is killed mid-write', async () => {
    const filler = 'x'.repeat(8 * 1024 * 1024)
    await expect(
      runJxa(`var pad = ${JSON.stringify(filler)}; delay(2); return 1;`, { timeout: 1 })
    ).rejects.toThrow(JxaExecutionError)
  }, 15000)
})

describe('runWithApp', () => {
  it('should get Calendar app name', async () => {
    const result = await runWithApp<string>('com.apple.iCal', 'return app.name();')
    expect(result).toBe('Calendar')
  })

  it('should check if Calendar is running', async () => {
    const result = await runWithApp<boolean>('com.apple.iCal', 'return app.running();')
    expect(typeof result).toBe('boolean')
  })

  it('should handle complex app queries', async () => {
    const result = await runWithApp<{ name: string; running: boolean }>(
      'com.apple.iCal',
      'return { name: app.name(), running: app.running() };'
    )
    expect(result.name).toBe('Calendar')
    expect(typeof result.running).toBe('boolean')
  })
})

/** Await `promise` and return what it rejected with, failing if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to reject')
}

/** A bundle identifier present on every Mac; constructing it sends no events. */
const FINDER = 'com.apple.finder'

/** A bundle identifier that no installed app has. */
const NOT_INSTALLED = 'com.example.macts.not-installed'

/** Generous: the first automation-process launch on a cold machine can be slow. */
const HOST_TEST_TIMEOUT_MS = 30000

const INTEGER: ValuePlan = { kind: 'integer' }
const DOUBLE: ValuePlan = { kind: 'double' }
const DATE: ValuePlan = { kind: 'date' }
const PERSON_REF: ValuePlan = { kind: 'reference', resource: 'Person', cardinality: 'one' }
const recordOf = (fields: Record<string, FieldPlan>): ValuePlan => ({ kind: 'record', fields })
const required = (value: ValuePlan): FieldPlan => ({ value, presence: 'required' })

/** A native script against Finder with passthrough plans unless overridden. */
function nativeScript(overrides: Partial<NativeScript>): NativeScript {
  return {
    bundleId: FINDER,
    body: 'return null;',
    input: {},
    inputPlan: PASSTHROUGH_PLAN,
    outputPlan: PASSTHROUGH_PLAN,
    references: {},
    ...overrides,
  }
}

describe('composeNativeScript', () => {
  it('embeds input, plans and references as JSON string literals, never as object literals or code', () => {
    const input = { first: 'SENTINEL_FIRST_3c1d', second: 'SENTINEL_SECOND_8e2a' }
    const inputPlan = recordOf({
      first: required({ kind: 'string' }),
      second: required({ kind: 'string' }),
    })
    const references: NativeReferenceTable = {
      SENTINEL_RESOURCE_51f0: {
        id: { kind: 'string' },
        addressing: { collection: 'people', lookup: 'byId', property: 'id' },
      },
    }
    const source = composeNativeScript(
      nativeScript({
        bundleId: 'com.apple.Notes',
        body: 'return args;',
        input,
        inputPlan,
        references,
      }),
      NATIVE_CODEC
    )
    const lines = source.split('\n')
    const argsLine = lines.find((line) => line.trimStart().startsWith('var args = '))
    const envLine = lines.find((line) => line.trimStart().startsWith('var env = '))
    expect(argsLine?.trim()).toBe(
      `var args = __mactsDecode(JSON.parse(${JSON.stringify(JSON.stringify(input))}), JSON.parse(${JSON.stringify(JSON.stringify(inputPlan))}), env);`
    )
    // The environment also hands the codec the host's position reader.
    expect(envLine?.trim()).toBe(
      `var env = { app: app, references: JSON.parse(${JSON.stringify(JSON.stringify(references))}), positionOf: __mactsPositionOf };`
    )
    const others = lines.filter((line) => line !== argsLine && line !== envLine).join('\n')
    for (const sentinel of [...Object.values(input), 'SENTINEL_RESOURCE_51f0']) {
      expect(others).not.toContain(sentinel)
    }
    expect(source).toContain('Application("com.apple.Notes")')
    expect(source).toContain(
      'return { ok: true, value: __mactsEncode(value, JSON.parse("{\\"kind\\":\\"passthrough\\"}"), env) };'
    )
    expect(source).toContain('(function (app, args, page) {\nreturn args;\n')
    // With no page window, the body's `page` argument is embedded null.
    expect(source).toContain(`})(app, args, JSON.parse(${JSON.stringify('null')}));`)
    expect(source.trimEnd().endsWith('JSON.stringify(__mactsOutcome);')).toBe(true)
  })

  it('creates the app before decoding, and runs the body only after the input decoded', () => {
    // Addressing a reference needs the app, so decoding follows it. Creating
    // the app object sends it nothing; the body, which sends the command,
    // runs only once the whole input has decoded.
    const source = composeNativeScript(
      nativeScript({ body: 'return SENTINEL_BODY_77aa;' }),
      NATIVE_CODEC
    )
    const app = source.indexOf('var app = Application(')
    const env = source.indexOf('var env = ')
    const decode = source.indexOf('var args = __mactsDecode(')
    const body = source.indexOf('SENTINEL_BODY_77aa')
    const encode = source.indexOf('__mactsEncode(value, ')
    expect(app).toBeGreaterThan(-1)
    expect(app).toBeLessThan(env)
    expect(env).toBeLessThan(decode)
    expect(decode).toBeLessThan(body)
    expect(body).toBeLessThan(encode)
  })

  it('embeds a page window as a JSON string literal, never as code', () => {
    const page = { offset: 25, size: 25, anchor: 'SENTINEL_ANCHOR_77f1' }
    const source = composeNativeScript(
      { ...nativeScript({ body: 'return page;' }), page },
      NATIVE_CODEC
    )
    const callLine = source
      .split('\n')
      .find((line) => line.trimStart().startsWith('})(app, args, '))
    expect(callLine?.trim()).toBe(
      `})(app, args, JSON.parse(${JSON.stringify(JSON.stringify(page))}));`
    )
    expect(source.split('\n').filter((line) => line.includes(page.anchor))).toEqual([callLine])
  })
})

describe('runNativeScript', () => {
  it(
    'round-trips plain JSON under passthrough plans',
    async () => {
      const input = { name: 'Groceries', count: 3, items: ['milk', true, null, { nested: 1.5 }] }
      expect(
        await runNativeScript(nativeScript({ body: 'return args;', input }), NATIVE_CODEC)
      ).toEqual({ ok: true, value: input })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'decodes integer input to a number and encodes the integer result',
    async () => {
      // D3: integers travel as canonical decimal text in an `integer` record.
      const outcome = await runNativeScript(
        nativeScript({
          body: "if (typeof args.n !== 'number') throw new Error('not decoded'); return args.n + 1;",
          input: { n: { integer: '41' } },
          inputPlan: recordOf({ n: required(INTEGER) }),
          outputPlan: INTEGER,
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({ ok: true, value: { integer: '42' } })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'keeps special double states through decode and encode',
    async () => {
      // D3: NaN and negative zero are explicit string states; D10: -0 is kept.
      const outcome = await runNativeScript(
        nativeScript({
          body: 'return { nan: args.nan, isNaN: args.nan !== args.nan, negativeZero: args.negativeZero, isNegativeZero: 1 / args.negativeZero === -Infinity };',
          input: { nan: { double: 'NaN' }, negativeZero: { double: '-0' } },
          inputPlan: recordOf({ nan: required(DOUBLE), negativeZero: required(DOUBLE) }),
          outputPlan: recordOf({
            nan: required(DOUBLE),
            isNaN: required({ kind: 'boolean' }),
            negativeZero: required(DOUBLE),
            isNegativeZero: required({ kind: 'boolean' }),
          }),
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: true,
        value: {
          nan: { double: 'NaN' },
          isNaN: true,
          negativeZero: { double: '-0' },
          isNegativeZero: true,
        },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'round-trips a date with exact milliseconds',
    async () => {
      // D3: dates are UTC text with exactly three fractional digits.
      const outcome = await runNativeScript(
        nativeScript({
          body: 'return { at: args.at, ms: args.at.getTime() };',
          input: { at: { date: '2026-10-31T17:04:05.123Z' } },
          inputPlan: recordOf({ at: required(DATE) }),
          outputPlan: recordOf({ at: required(DATE), ms: required(INTEGER) }),
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: true,
        value: {
          at: { date: '2026-10-31T17:04:05.123Z' },
          ms: { integer: String(Date.UTC(2026, 9, 31, 17, 4, 5, 123)) },
        },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'keeps a __proto__ input key as an own property',
    async () => {
      const input = JSON.parse('{"__proto__":{"polluted":true},"plain":1}') as WireRecord
      const outcome = await runNativeScript(
        nativeScript({
          body: 'return { keys: Object.keys(args), polluted: args.polluted === true };',
          input,
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: true,
        value: { keys: ['__proto__', 'plain'], polluted: false },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports a passthrough body that returns undefined as the value null',
    async () => {
      expect(
        await runNativeScript(nativeScript({ body: 'return undefined;' }), NATIVE_CODEC)
      ).toEqual({ ok: true, value: null })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports null for a none output plan, whatever the body returns',
    async () => {
      // D3: the wire form of `none` is null.
      expect(
        await runNativeScript(
          nativeScript({ body: 'return { ignored: 1 };', outputPlan: { kind: 'none' } }),
          NATIVE_CODEC
        )
      ).toEqual({ ok: true, value: null })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports a result that violates the output plan as a codec encode failure with its path',
    async () => {
      const outcome = await runNativeScript(
        nativeScript({
          body: "return { n: 'x' };",
          outputPlan: recordOf({ n: required(INTEGER) }),
        }),
        NATIVE_CODEC
      )
      if (outcome.ok || outcome.failure.source !== 'codec') {
        expect.fail(`Expected a codec failure, received ${JSON.stringify(outcome)}`)
      }
      expect(outcome.failure.direction).toBe('encode')
      expect(outcome.failure.path).toEqual(['n'])
      expect(outcome.failure.message).not.toBe('')
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports input that violates the input plan as a codec decode failure, before the body runs',
    async () => {
      const outcome = await runNativeScript(
        nativeScript({
          body: "var error = new Error('the body ran'); error.errorNumber = -1; throw error;",
          input: { n: { integer: '042' } },
          inputPlan: recordOf({ n: required(INTEGER) }),
        }),
        NATIVE_CODEC
      )
      if (outcome.ok || outcome.failure.source !== 'codec') {
        expect.fail(`Expected a codec failure, received ${JSON.stringify(outcome)}`)
      }
      expect(outcome.failure.direction).toBe('decode')
      expect(outcome.failure.path).toEqual(['n'])
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports a reference it cannot convert as a marked decode failure, and never runs the body',
    async () => {
      // The script lists no reference table entry for Person, so the codec
      // cannot address the person; the body, which would send the command,
      // must not run.
      const outcome = await runNativeScript(
        nativeScript({
          body: "var error = new Error('the body ran'); error.errorNumber = -1; throw error;",
          input: {
            for: {
              reference: { resource: 'Person', form: 'identity', cardinality: 'one', id: 'p-1' },
            },
          },
          inputPlan: recordOf({ for: required(PERSON_REF) }),
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: false,
        failure: {
          source: 'codec',
          direction: 'decode',
          path: ['for'],
          message:
            'References to "Person" have no conversion in this codec: the app does not find its objects by their identifier',
          unsupportedKind: 'reference',
        },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'encodes an object at a reference position with the reference table it carries',
    async () => {
      // The body returns a stand-in object with an identifier member, as an
      // app object has; the codec reads it through the table's addressing.
      const outcome = await runNativeScript(
        nativeScript({
          body: "return { id: function () { return 'p-1'; } };",
          outputPlan: PERSON_REF,
          references: {
            Person: {
              id: { kind: 'string' },
              addressing: { collection: 'people', lookup: 'byId', property: 'id' },
            },
          },
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: true,
        value: {
          reference: { resource: 'Person', form: 'identity', cardinality: 'one', id: 'p-1' },
        },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'keeps the missing resource of a codec failure in the outcome',
    async () => {
      // The catch clause describes a missing referenced object exactly as the
      // codec throws it; the body throws that shape itself, so no app is
      // addressed.
      const outcome = await runNativeScript(
        nativeScript({
          body: "throw { name: 'MactsCodecError', direction: 'decode', path: ['for'], message: 'missing', missingResource: 'Person' };",
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: false,
        failure: {
          source: 'codec',
          direction: 'decode',
          path: ['for'],
          message: 'missing',
          missingResource: 'Person',
        },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports an error thrown with a number as an app failure carrying that number',
    async () => {
      const outcome = await runNativeScript(
        nativeScript({
          body: "var missing = new Error('No such object.'); missing.errorNumber = -1728; throw missing;",
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: false,
        failure: { source: 'app', message: 'No such object.', errorNumber: -1728 },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'keeps the missing resource an app failure names, with its number',
    async () => {
      // A scoped body's parent check throws the no-such-object number with the
      // parent's resource, so the failure names the missing parent.
      const outcome = await runNativeScript(
        nativeScript({
          body: "var missing = new Error('No such object.'); missing.errorNumber = -1728; missing.missingResource = 'Window'; throw missing;",
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: false,
        failure: {
          source: 'app',
          message: 'No such object.',
          errorNumber: -1728,
          missingResource: 'Window',
        },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'keeps what an app failure says was being read, with its number',
    async () => {
      // A list body or the codec notes the read an app error escaped from.
      const outcome = await runNativeScript(
        nativeScript({
          body: `var missing = new Error('No such object.'); missing.errorNumber = -1728; missing[${JSON.stringify(NATIVE_READING_KEY)}] = 'the items'; throw missing;`,
        }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({
        ok: false,
        failure: {
          source: 'app',
          message: 'No such object.',
          errorNumber: -1728,
          reading: 'the items',
        },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports a thrown non-error value as an app failure without a number',
    async () => {
      const outcome = await runNativeScript(
        nativeScript({ body: "throw 'plain text';" }),
        NATIVE_CODEC
      )
      expect(outcome).toEqual({ ok: false, failure: { source: 'app', message: 'plain text' } })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'reports a bundle identifier with no installed app as an app failure (-2700)',
    async () => {
      // Observed on macOS 27.2: the application constructor throws inside the
      // script with this message and number.
      const outcome = await runNativeScript(nativeScript({ bundleId: NOT_INSTALLED }), NATIVE_CODEC)
      expect(outcome).toEqual({
        ok: false,
        failure: { source: 'app', message: "Application can't be found.", errorNumber: -2700 },
      })
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'rejects a body that does not compile with a process failure',
    async () => {
      const error = await rejectionOf(
        runNativeScript(nativeScript({ body: 'return 1 +;' }), NATIVE_CODEC)
      )
      expect(error).toBeInstanceOf(JxaExecutionError)
      if (!(error instanceof JxaExecutionError)) return
      expect(error.kind).toBe('exited')
      expect(error.timedOut).toBe(false)
      expect(error.stderr).toContain('syntax error')
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'rejects with timedOut when its own time limit stops the process',
    async () => {
      const error = await rejectionOf(
        runNativeScript(nativeScript({ body: 'while (true) {}' }), NATIVE_CODEC, { timeout: 300 })
      )
      expect(error).toBeInstanceOf(JxaExecutionError)
      if (!(error instanceof JxaExecutionError)) return
      expect(error.kind).toBe('timed-out')
      expect(error.timedOut).toBe(true)
    },
    HOST_TEST_TIMEOUT_MS
  )

  it(
    'does not report a process killed by a signal it did not send as a timeout',
    async () => {
      // The process receives SIGKILL from outside the transport's timer, as an
      // out-of-memory kill or an external `kill -9` would deliver it.
      const error = await rejectionOf(
        runNativeScript(
          nativeScript({ body: "ObjC.import('signal'); $.raise(9); return 1;" }),
          NATIVE_CODEC,
          { timeout: 20000 }
        )
      )
      expect(error).toBeInstanceOf(JxaExecutionError)
      if (!(error instanceof JxaExecutionError)) return
      expect(error.kind).toBe('signalled')
      expect(error.timedOut).toBe(false)
      expect((error.cause as { signal?: unknown } | undefined)?.signal).toBe('SIGKILL')
    },
    HOST_TEST_TIMEOUT_MS
  )

  describe('malformed outcomes', () => {
    /**
     * A codec whose prelude replaces the serializer, so the process prints
     * `output` instead of the outcome. It stands in for a defective script.
     */
    function codecPrinting(output: string): NativeCodec {
      return {
        prelude: [
          'var __mactsDecode = function (wire) { return wire; };',
          'var __mactsEncode = function (native) { return native; };',
          `JSON.stringify = function () { return ${JSON.stringify(output)}; };`,
        ].join('\n'),
      }
    }

    it.each([
      ['output that is not JSON', 'not json'],
      ['a JSON value that is not an object', '[1]'],
      ['an object with no ok flag', '{"value":1}'],
      ['a success whose value is not finite', '{"ok":true,"value":1e999}'],
      ['a failure with no message', '{"ok":false,"failure":{"source":"app"}}'],
      ['a failure with an unknown source', '{"ok":false,"failure":{"source":"x","message":"m"}}'],
      [
        'an app failure with a non-numeric number',
        '{"ok":false,"failure":{"source":"app","message":"m","errorNumber":"1"}}',
      ],
      [
        'an app failure with a non-text missing resource',
        '{"ok":false,"failure":{"source":"app","message":"m","errorNumber":-1728,"missingResource":1}}',
      ],
      [
        'an app failure with a non-text reading',
        '{"ok":false,"failure":{"source":"app","message":"m","errorNumber":-1728,"reading":1}}',
      ],
      [
        'a codec failure with no direction',
        '{"ok":false,"failure":{"source":"codec","path":[],"message":"m"}}',
      ],
      [
        'a codec failure with an invalid path',
        '{"ok":false,"failure":{"source":"codec","direction":"encode","path":[{}],"message":"m"}}',
      ],
      [
        'a codec failure with a non-text unsupported kind',
        '{"ok":false,"failure":{"source":"codec","direction":"decode","path":[],"message":"m","unsupportedKind":1}}',
      ],
      [
        'a codec failure with a non-text missing resource',
        '{"ok":false,"failure":{"source":"codec","direction":"decode","path":[],"message":"m","missingResource":1}}',
      ],
      [
        'a codec failure that is both unsupported and missing',
        '{"ok":false,"failure":{"source":"codec","direction":"decode","path":[],"message":"m","unsupportedKind":"reference","missingResource":"Person"}}',
      ],
    ])(
      'rejects %s as a malformed outcome',
      async (_, output) => {
        const error = await rejectionOf(runNativeScript(nativeScript({}), codecPrinting(output)))
        expect(error).toBeInstanceOf(JxaExecutionError)
        if (!(error instanceof JxaExecutionError)) return
        expect(error.kind).toBe('unreadable-output')
        expect(error.message).toContain('malformed outcome')
        expect(error.timedOut).toBe(false)
      },
      HOST_TEST_TIMEOUT_MS
    )
  })
})
