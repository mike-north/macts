/**
 * Test-only support for running the real native executor against a stand-in
 * application instead of the macOS automation host.
 *
 * {@link standInTransport} evaluates the script the built-in transport would
 * run, composed by the executor's own `composeNativeScript`, in a fresh
 * `node:vm` context whose `Application()` returns the stand-in. Everything
 * but the host is therefore the shipped code: the body, the value codec, the
 * input and output plans, and the reference table. {@link recorded} wraps a
 * stand-in so a test can assert exactly which of its members a script used,
 * and in what order.
 *
 * `standInTransport` is reachable from other macts packages through
 * `@macts/core/testing`, which is not public API.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D4)
 */

import { createContext, runInContext } from 'node:vm'
import { composeNativeScript, parseNativeOutcome } from '../executor.js'
import { NATIVE_CODEC, type NativeScript } from '../native-codec.js'
import type { NativeTransport } from '../native-executor.js'

/**
 * A transport that runs each script against `app` in an isolated context and
 * appends the script to `scripts`, so a test can inspect what the executor
 * built as well as what it returned. A malformed outcome rejects, as it does
 * from the real host.
 *
 * @param app - The stand-in application every `Application()` call returns.
 * @param scripts - Receives each script run, in order.
 */
export function standInTransport(app: object, scripts: NativeScript[] = []): NativeTransport {
  return {
    run(script) {
      scripts.push(script)
      const context = createContext({ ObjC: { import: () => undefined }, Application: () => app })
      const stdout: unknown = runInContext(composeNativeScript(script, NATIVE_CODEC), context)
      const outcome = parseNativeOutcome(String(stdout))
      if (typeof outcome === 'string') {
        return Promise.reject(new Error(`Malformed native outcome: ${outcome}`))
      }
      return Promise.resolve(outcome)
    },
  }
}

/**
 * Wraps `target` so that every read, call, or inspection of it is appended to
 * `uses`, and so is every use of a member value it hands out, labelled by the
 * path that reached it (`read app.people`, `call app.people.byId`). Setting
 * `includeStandardAdditions` on the application, which every script does when
 * it creates the application object, is not recorded.
 *
 * @param target - The stand-in object.
 * @param name - The label of `target` in `uses`, such as `app`.
 * @param uses - Receives one entry per use.
 */
export function recorded<T extends object>(target: T, name: string, uses: string[]): T {
  const wrap = (value: unknown, label: string): unknown =>
    (typeof value === 'object' || typeof value === 'function') && value !== null
      ? recorded(value, label, uses)
      : value
  return new Proxy(target, {
    get(object, key, receiver) {
      const label = `${name}.${String(key)}`
      uses.push(`read ${label}`)
      return wrap(Reflect.get(object, key, receiver), label)
    },
    apply(fn, thisArg, args: unknown[]) {
      uses.push(`call ${name}`)
      return wrap(Reflect.apply(fn as (...a: unknown[]) => unknown, thisArg, args), `${name}()`)
    },
    set(object, key, value) {
      if (!(name === 'app' && key === 'includeStandardAdditions')) {
        uses.push(`set ${name}.${String(key)}`)
      }
      return Reflect.set(object, key, value)
    },
    has(object, key) {
      uses.push(`has ${name}.${String(key)}`)
      return Reflect.has(object, key)
    },
    ownKeys(object) {
      uses.push(`keys ${name}`)
      return Reflect.ownKeys(object)
    },
    getOwnPropertyDescriptor(object, key) {
      uses.push(`describe ${name}.${String(key)}`)
      return Reflect.getOwnPropertyDescriptor(object, key)
    },
  })
}
