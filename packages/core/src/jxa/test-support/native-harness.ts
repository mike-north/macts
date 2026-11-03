/**
 * Test-only harness for exercising a {@link NativeCodec} prelude outside the
 * package's own runtime.
 *
 * Two hosts are supported:
 *
 * - {@link evaluatePrelude} runs a prelude in a fresh `node:vm` context. The
 *   context starts with only the language built-ins, so any reference the
 *   embedded source makes to module scope, imports, or host objects fails
 *   there, and the globals the prelude adds can be counted exactly.
 * - {@link runNativeScript} runs a prelude inside the real macOS automation
 *   process (`/usr/bin/osascript -l JavaScript`), composing the script the same
 *   way the native executor does: prelude, decode of the wire input, the body
 *   invoked as `(app, args)`, encode of its result, and one try/catch that
 *   reports a {@link NativeOutcome}. The body and the codec receive
 *   `app = null`; the harness never addresses an application, so it needs no
 *   automation permission.
 *
 * This module is not exported from the package.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D4)
 */

import { execFile } from 'node:child_process'
import { createContext, runInContext } from 'node:vm'
import type { IssuePath, ValuePlan, WireRecord, WireValue } from '@macts/contracts'
import {
  NATIVE_CODEC_ERROR_NAME,
  NATIVE_DECODE_FUNCTION,
  NATIVE_ENCODE_FUNCTION,
  type NativeCodec,
  type NativeCodecEnvironment,
  type NativeFailure,
  type NativeOutcome,
  type NativeReferenceTable,
} from '../native-codec.js'

/** Identity tag marking embedded automation-process JavaScript for tooling. */
const js = String.raw

/** A codec function as seen from outside the realm that defines it. */
export type CodecFunction = (
  value: unknown,
  plan: ValuePlan,
  env?: NativeCodecEnvironment
) => unknown

/** What evaluating a prelude in an isolated context produced. */
export interface EvaluatedPrelude {
  /** Global names the prelude added to the context, sorted. */
  readonly addedGlobals: readonly string[]
  /** The context's decode function. */
  readonly decode: CodecFunction
  /** The context's encode function. */
  readonly encode: CodecFunction
}

/** Lists the own property names of a context's global object. */
function globalNames(context: object): string[] {
  const names: unknown = runInContext('Object.getOwnPropertyNames(globalThis)', context)
  if (!Array.isArray(names) || !names.every((name): name is string => typeof name === 'string')) {
    throw new Error('Could not list the global names of the evaluation context')
  }
  return names
}

/** Reads a global function out of a context and adapts it to a host-callable function. */
function contextFunction(context: object, name: string): CodecFunction {
  const fn: unknown = runInContext(`typeof ${name} === 'function' ? ${name} : undefined`, context)
  if (typeof fn !== 'function') {
    throw new Error(`The prelude did not define a function named ${name}`)
  }
  return (value, plan, env) => {
    const result: unknown = Reflect.apply(fn, undefined, [value, plan, env])
    return result
  }
}

/**
 * Evaluates a prelude in a fresh `node:vm` context and returns the functions
 * it defined, together with the exact set of globals it added.
 */
export function evaluatePrelude(prelude: string): EvaluatedPrelude {
  const context = createContext({})
  const before = new Set(globalNames(context))
  runInContext(prelude, context)
  const addedGlobals = globalNames(context)
    .filter((name) => !before.has(name))
    .sort()
  return {
    addedGlobals,
    decode: contextFunction(context, NATIVE_DECODE_FUNCTION),
    encode: contextFunction(context, NATIVE_ENCODE_FUNCTION),
  }
}

/** One native invocation without a target application. */
export interface HarnessScript {
  /** Function body run as `(app, args)` with `app = null`. */
  readonly body: string
  /** Wire input record, decoded against `inputPlan` into `args`. */
  readonly input: WireRecord
  /** Plan for decoding `input`. */
  readonly inputPlan: ValuePlan
  /** Plan for encoding the body's result. */
  readonly outputPlan: ValuePlan
  /**
   * The reference table the codec is given, with no application: an encoded
   * reference reads its identifier from the object, and a decoded one fails
   * as unsupported because there is no app to address. Empty when omitted.
   */
  readonly references?: NativeReferenceTable
}

/**
 * Composes the automation-process script for {@link HarnessScript} in the
 * executor's shape. Values are embedded as JSON text, never interpolated into
 * expressions, and the script's final expression is the serialized outcome.
 */
export function composeNativeScript(codec: NativeCodec, script: HarnessScript): string {
  return js`ObjC.import('stdlib');
${codec.prelude}
var __mactsOutcome = (function () {
  try {
    var env = { app: null, references: ${JSON.stringify(script.references ?? {})} };
    var args = ${NATIVE_DECODE_FUNCTION}(${JSON.stringify(script.input)}, ${JSON.stringify(script.inputPlan)}, env);
    var value = (function (app, args) {
${script.body}
    })(null, args);
    return { ok: true, value: ${NATIVE_ENCODE_FUNCTION}(value, ${JSON.stringify(script.outputPlan)}, env) };
  } catch (e) {
    if (e !== null && typeof e === 'object' && e.name === ${JSON.stringify(NATIVE_CODEC_ERROR_NAME)}) {
      var codecFailure = { source: 'codec', direction: e.direction, path: e.path, message: e.message };
      if (typeof e.unsupportedKind === 'string') {
        codecFailure.unsupportedKind = e.unsupportedKind;
      }
      if (typeof e.missingResource === 'string') {
        codecFailure.missingResource = e.missingResource;
      }
      return { ok: false, failure: codecFailure };
    }
    var failure = { source: 'app', message: String(e !== null && typeof e === 'object' && 'message' in e ? e.message : e) };
    if (e !== null && typeof e === 'object' && typeof e.errorNumber === 'number') {
      failure.errorNumber = e.errorNumber;
    }
    return { ok: false, failure: failure };
  }
})();
JSON.stringify(__mactsOutcome);
`
}

/** Whether a value is a non-array object. */
function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether a value is an issue path: strings and numbers only. */
function isIssuePath(value: unknown): value is IssuePath {
  return (
    Array.isArray(value) &&
    value.every((step) => typeof step === 'string' || typeof step === 'number')
  )
}

/** Validates the failure half of a parsed outcome. */
function parseFailure(value: unknown): NativeFailure {
  if (!isObject(value) || typeof value['message'] !== 'string') {
    throw new Error(`Malformed native failure: ${JSON.stringify(value)}`)
  }
  const message = value['message']
  if (value['source'] === 'codec') {
    const direction = value['direction']
    const path = value['path']
    if ((direction !== 'decode' && direction !== 'encode') || !isIssuePath(path)) {
      throw new Error(`Malformed codec failure: ${JSON.stringify(value)}`)
    }
    const unsupportedKind = value['unsupportedKind']
    const missingResource = value['missingResource']
    if (
      (unsupportedKind !== undefined && typeof unsupportedKind !== 'string') ||
      (missingResource !== undefined && typeof missingResource !== 'string')
    ) {
      throw new Error(`Malformed codec failure: ${JSON.stringify(value)}`)
    }
    return {
      source: 'codec',
      direction,
      path,
      message,
      ...(unsupportedKind === undefined ? {} : { unsupportedKind }),
      ...(missingResource === undefined ? {} : { missingResource }),
    }
  }
  if (value['source'] === 'collection') return { source: 'collection', message }
  if (value['source'] === 'app') {
    const errorNumber = value['errorNumber']
    return typeof errorNumber === 'number'
      ? { source: 'app', message, errorNumber }
      : { source: 'app', message }
  }
  throw new Error(`Malformed native failure source: ${JSON.stringify(value)}`)
}

/**
 * Parses the automation process's stdout into a {@link NativeOutcome}.
 * The `value` of a success is returned as parsed JSON.
 */
export function parseNativeOutcome(stdout: string): NativeOutcome {
  const parsed: unknown = JSON.parse(stdout.trim())
  if (!isObject(parsed)) {
    throw new Error(`Malformed native outcome: ${stdout}`)
  }
  if (parsed['ok'] === true) {
    // The outcome was produced by `JSON.stringify`, so its value is JSON.
    const value = parsed['value'] as WireValue
    return { ok: true, value }
  }
  if (parsed['ok'] === false) {
    return { ok: false, failure: parseFailure(parsed['failure']) }
  }
  throw new Error(`Malformed native outcome: ${stdout}`)
}

/** Options for {@link runNativeScript}. */
export interface RunNativeScriptOptions {
  /** Process timeout in milliseconds. */
  readonly timeout?: number
}

/**
 * Runs {@link HarnessScript} in the real automation process and resolves to
 * the outcome it reported. The script travels on stdin, so no value ever
 * crosses a shell. Rejects if the process itself fails, which means the
 * composed script did not run to completion.
 */
export function runNativeScript(
  codec: NativeCodec,
  script: HarnessScript,
  options: RunNativeScriptOptions = {}
): Promise<NativeOutcome> {
  const source = composeNativeScript(codec, script)
  return new Promise((resolve, reject) => {
    const child = execFile(
      '/usr/bin/osascript',
      ['-l', 'JavaScript', '-'],
      { timeout: options.timeout ?? 20000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`The automation process failed: ${error.message}\n${stderr}`))
          return
        }
        try {
          resolve(parseNativeOutcome(stdout))
        } catch (parseError) {
          reject(parseError instanceof Error ? parseError : new Error(String(parseError)))
        }
      }
    )
    if (!child.stdin) {
      reject(new Error('The automation process has no stdin'))
      return
    }
    child.stdin.end(source)
  })
}
