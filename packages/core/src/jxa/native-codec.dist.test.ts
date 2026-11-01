/**
 * Built-module tests for the value codec: the prelude exported by the
 * package's build output, not by the source under test transformation.
 *
 * The prelude embeds the codec's source text via `Function.prototype.toString()`,
 * so whatever the build does to that function (lowering syntax, injecting
 * helpers, renaming) ships inside the automation process. These tests load
 * `dist/index.js` in a plain Node process, exactly as a consumer would, and run
 * its prelude both in an isolated `node:vm` context and, on macOS, in the real
 * automation process. On macOS they also run the built `runNativeScript`, so
 * the shipped script composition and the shipped prelude are proven together.
 *
 * The build output must exist. A missing `dist` fails the suite with an
 * instruction to build; it is never skipped silently.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md — D3 (wire
 *   encoding), D4 (native codec interface and embedding), D10 (signed zero,
 *   classification, integer domain)
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { ValuePlan } from '@macts/contracts'
import { beforeAll, describe, expect, it } from 'vitest'
import type { NativeCodec } from './native-codec.js'
import {
  evaluatePrelude,
  runNativeScript,
  type EvaluatedPrelude,
} from './test-support/native-harness.js'

const DIST_ENTRY = fileURLToPath(new URL('../../dist/index.js', import.meta.url))

const INTEGER: ValuePlan = { kind: 'integer' }
const DOUBLE: ValuePlan = { kind: 'double' }
const DATE: ValuePlan = { kind: 'date' }
const UNKNOWN: ValuePlan = { kind: 'unknown' }

/**
 * Reads `NATIVE_CODEC.prelude` from the built package in a separate Node
 * process, so the text is exactly what a consumer of `dist` receives.
 */
function readDistPrelude(): string {
  if (!existsSync(DIST_ENTRY)) {
    throw new Error(
      `The built package is missing (${DIST_ENTRY}). Run \`pnpm --filter @macts/core build\` before this test.`
    )
  }
  const script = [
    `import { NATIVE_CODEC } from ${JSON.stringify(pathToFileURL(DIST_ENTRY).href)};`,
    'process.stdout.write(JSON.stringify(NATIVE_CODEC.prelude));',
  ].join('\n')
  const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
  })
  const prelude: unknown = JSON.parse(stdout)
  if (typeof prelude !== 'string' || prelude.length === 0) {
    throw new Error('The built package does not export a NATIVE_CODEC prelude string')
  }
  return prelude
}

describe('built NATIVE_CODEC prelude', () => {
  let codec: NativeCodec
  let evaluated: EvaluatedPrelude

  beforeAll(() => {
    codec = { prelude: readDistPrelude() }
    evaluated = evaluatePrelude(codec.prelude)
  })

  it('defines exactly the decode and encode globals', () => {
    expect(evaluated.addedGlobals).toEqual(['__mactsDecode', '__mactsEncode'])
  })

  it('encodes numbers by classification and special state', () => {
    const { encode } = evaluated
    expect(encode(42, INTEGER)).toEqual({ integer: '42' })
    expect(encode(-0, INTEGER)).toEqual({ integer: '0' })
    expect(encode(3, DOUBLE)).toEqual({ double: 3 })
    expect(encode(-0, DOUBLE)).toEqual({ double: '-0' })
    expect(encode(Number.NaN, DOUBLE)).toEqual({ double: 'NaN' })
    expect(encode(3, UNKNOWN)).toEqual({ double: 3 })
    expect(encode({ integer: '42' }, UNKNOWN)).toEqual({ record: { integer: '42' } })
  })

  it('decodes dates with offsets and rejects non-canonical integers', () => {
    const { decode } = evaluated
    const date = decode({ date: '2026-10-31T17:04:05.120+02:30' }, DATE) as Date
    expect(date.getTime()).toBe(Date.UTC(2026, 9, 31, 14, 34, 5, 120))
    expect(() => decode({ integer: '042' }, INTEGER)).toThrow()
  })

  it('throws the contracted codec error object', () => {
    let thrown: unknown
    try {
      evaluated.encode(
        { events: [{ count: 1.5 }] },
        {
          kind: 'record',
          fields: {
            events: {
              presence: 'required',
              value: {
                kind: 'array',
                items: {
                  kind: 'record',
                  fields: { count: { presence: 'required', value: INTEGER } },
                },
              },
            },
          },
        }
      )
    } catch (error) {
      thrown = error
    }
    expect(thrown).toEqual({
      name: 'MactsCodecError',
      direction: 'encode',
      path: ['events', 0, 'count'],
      message: 'Expected an integer, received 1.5',
    })
  })

  it.skipIf(process.platform !== 'darwin')(
    'round-trips values through the real automation process',
    async () => {
      const plan: ValuePlan = {
        kind: 'record',
        fields: {
          zero: { presence: 'required', value: DOUBLE },
          count: { presence: 'required', value: INTEGER },
          at: { presence: 'required', value: DATE },
        },
      }
      const outcome = await runNativeScript(codec, {
        body: 'return { zero: -args.zero, count: args.count + 1, at: args.at };',
        input: {
          zero: { double: 0 },
          count: { integer: '41' },
          at: { date: '2026-10-31T17:04:05.120+02:30' },
        },
        inputPlan: plan,
        outputPlan: plan,
      })
      expect(outcome).toEqual({
        ok: true,
        value: {
          zero: { double: '-0' },
          count: { integer: '42' },
          at: { date: '2026-10-31T14:34:05.120Z' },
        },
      })
    },
    30000
  )
})

/**
 * Runs one native script with the built package's own `runNativeScript` and
 * `NATIVE_CODEC`, in a separate Node process, and returns the outcome it
 * resolves to. This exercises the shipped composition and the shipped prelude
 * together, as a consumer of `dist` runs them.
 */
function runWithDist(script: Record<string, unknown>): unknown {
  if (!existsSync(DIST_ENTRY)) {
    throw new Error(
      `The built package is missing (${DIST_ENTRY}). Run \`pnpm --filter @macts/core build\` before this test.`
    )
  }
  const program = [
    `import { NATIVE_CODEC, runNativeScript } from ${JSON.stringify(pathToFileURL(DIST_ENTRY).href)};`,
    `const outcome = await runNativeScript(${JSON.stringify(script)}, NATIVE_CODEC, { timeout: 30000 });`,
    'process.stdout.write(JSON.stringify(outcome));',
  ].join('\n')
  const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', program], {
    encoding: 'utf8',
  })
  return JSON.parse(stdout)
}

describe.skipIf(process.platform !== 'darwin')(
  'built runNativeScript with the built prelude',
  () => {
    // Application() for Finder sends no event, so no automation permission is needed.
    const FINDER = 'com.apple.finder'
    const plan: ValuePlan = {
      kind: 'record',
      fields: {
        count: { presence: 'required', value: INTEGER },
        at: { presence: 'required', value: DATE },
      },
    }

    it('converts input and result through the contract inside the automation process', () => {
      const outcome = runWithDist({
        bundleId: FINDER,
        body: 'return { count: args.count + 1, at: new Date(args.at.getTime() + 1000) };',
        input: { count: { integer: '41' }, at: { date: '2026-10-31T17:04:05.120+02:30' } },
        inputPlan: plan,
        outputPlan: plan,
      })
      // D3: integers travel as canonical decimal strings; dates as UTC ISO text
      // with milliseconds. 14:34:05.120Z plus one second.
      expect(outcome).toEqual({
        ok: true,
        value: { count: { integer: '42' }, at: { date: '2026-10-31T14:34:06.120Z' } },
      })
    }, 30000)

    it('reports a result that violates the output plan as a codec encode failure', () => {
      const outcome = runWithDist({
        bundleId: FINDER,
        body: 'return { count: 1.5, at: args.at };',
        input: { count: { integer: '1' }, at: { date: '2026-10-31T14:34:05.120Z' } },
        inputPlan: plan,
        outputPlan: plan,
      })
      // D4: the codec's own error object becomes a `codec` failure with its path.
      expect(outcome).toEqual({
        ok: false,
        failure: {
          source: 'codec',
          direction: 'encode',
          path: ['count'],
          message: 'Expected an integer, received 1.5',
        },
      })
    }, 30000)
  }
)
