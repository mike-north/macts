/**
 * Nothing reaches the app before the whole input converted (phases/13 D4).
 *
 * A native script creates the application object first, because finding a
 * referenced object needs it, but it reads or calls no member of the app
 * until every input value has converted. So an input value that cannot
 * convert (a file, a file source, a reference form the provider cannot
 * convert yet, or an invalid value) fails before the app receives anything,
 * wherever it sits in the input. Only then are the input's references found
 * in the app, and only then does the body send its command.
 *
 * Each case runs the real native executor on the real composed script,
 * evaluated in an isolated context against a stand-in Contacts application
 * that records every member read, call, or inspection made of it or of the
 * objects it hands out. Setting `includeStandardAdditions` on the application
 * object at creation is the one use the script may make of it beforehand,
 * and it is not recorded.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4)
 */

import { createContext, runInContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  InternalError,
  ValidationError,
  type FieldPlan,
  type ResourcePlanTable,
  type ValuePlan,
  type WireRecord,
} from '@macts/contracts'
import type { ExecutionRequest } from '../execution/executor.js'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { composeNativeScript } from './executor.js'
import { NATIVE_CODEC } from './native-codec.js'
import { createNativeExecutor, type NativeTransport } from './native-executor.js'
import { parseNativeOutcome } from './test-support/native-harness.js'

const CONTACTS_MANIFEST = fileURLToPath(
  new URL('../../../../manifests/contacts/app.yaml', import.meta.url)
)

let contacts: AppManifest
beforeAll(async () => {
  contacts = await loadManifest(CONTACTS_MANIFEST)
})

const PERSON_REF: ValuePlan = { kind: 'reference', resource: 'Person', cardinality: 'one' }
const FILE: ValuePlan = { kind: 'file' }
const FILE_SOURCE: ValuePlan = { kind: 'file-source' }
const INTEGER: ValuePlan = { kind: 'integer' }
const required = (value: ValuePlan): FieldPlan => ({ value, presence: 'required' })

/** Contacts' person identifiers are text, as its generated contract says. */
const RESOURCE_PLANS: ResourcePlanTable = { Person: { id: { kind: 'string' } } }

/** A reference to the stand-in app's one person, in wire form. */
const PERSON = {
  reference: { resource: 'Person', form: 'identity', cardinality: 'one', id: 'p-1' },
}

/** A reference by name, a selector form the provider cannot convert yet. */
const PERSON_BY_NAME = {
  reference: {
    resource: 'Person',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'name', name: 'Ada' },
  },
}

/**
 * Wraps `target` so that every read, call, or inspection of it is appended to
 * `uses`, and so is every use of a member value it hands out. Setting
 * `includeStandardAdditions` on the application is not recorded.
 */
function recorded<T extends object>(target: T, name: string, uses: string[]): T {
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

/** A stand-in Contacts application with one person, recording every use. */
function standInContacts() {
  const uses: string[] = []
  const person = { exists: () => true, id: () => 'p-1' }
  const app = {
    includeStandardAdditions: false,
    people: { byId: (id: unknown) => (id === 'p-1' ? person : { exists: () => false }) },
    actionTitle: (_params: unknown) => 'Title',
  }
  return { app: recorded(app, 'app', uses), uses }
}

/** A transport that evaluates the composed script against `app` in an isolated context. */
function standInTransport(app: object): NativeTransport {
  return {
    run(script) {
      const context = createContext({ ObjC: { import: () => undefined }, Application: () => app })
      const stdout: unknown = runInContext(composeNativeScript(script, NATIVE_CODEC), context)
      return Promise.resolve(parseNativeOutcome(String(stdout)))
    },
  }
}

/** Runs Contacts' `actionTitle` with `input` under `inputPlan` against `app`. */
function actionTitle(app: object, input: WireRecord, fields: Record<string, FieldPlan>) {
  const request: ExecutionRequest = {
    manifest: contacts,
    target: { command: 'actionTitle' },
    input,
    inputPlan: { kind: 'record', fields },
    outputPlan: { kind: 'none' },
    resourcePlans: RESOURCE_PLANS,
  }
  return createNativeExecutor({ transport: standInTransport(app) }).execute(request)
}

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

describe('a native script uses the app only after the whole input converted (D4)', () => {
  it('finds a referenced person, then sends the command, and uses the app for nothing else', async () => {
    const { app, uses } = standInContacts()

    await expect(
      actionTitle(
        app,
        { with: 'email', for: PERSON },
        {
          with: required({ kind: 'unknown' }),
          for: required(PERSON_REF),
        }
      )
    ).resolves.toBeNull()

    // First the reference is found and its existence checked, then the body
    // sends the command: nothing else, and nothing earlier.
    expect(uses).toEqual([
      'read app.people',
      'read app.people.byId',
      'call app.people.byId',
      'read app.people.byId().exists',
      'call app.people.byId().exists',
      'read app.actionTitle',
      'call app.actionTitle',
    ])
  })

  it.each([
    ['a file', FILE],
    ['a file source', FILE_SOURCE],
  ])(
    'fails a reference followed by %s with InternalError, using the app not at all',
    async (_label, laterPlan) => {
      const { app, uses } = standInContacts()

      const error = await rejectionOf(
        actionTitle(
          app,
          { with: 'email', for: PERSON, attachment: '/tmp/a' },
          {
            with: required({ kind: 'unknown' }),
            for: required(PERSON_REF),
            attachment: required(laterPlan),
          }
        )
      )

      expect(error).toBeInstanceOf(InternalError)
      expect(uses).toEqual([])
    }
  )

  it.each([
    ['a file', FILE],
    ['a file source', FILE_SOURCE],
  ])(
    'fails %s followed by a reference with InternalError, using the app not at all',
    async (_label, earlierPlan) => {
      const { app, uses } = standInContacts()

      const error = await rejectionOf(
        actionTitle(
          app,
          { attachment: '/tmp/a', with: 'email', for: PERSON },
          {
            attachment: required(earlierPlan),
            with: required({ kind: 'unknown' }),
            for: required(PERSON_REF),
          }
        )
      )

      expect(error).toBeInstanceOf(InternalError)
      expect(uses).toEqual([])
    }
  )

  it('fails a selector reference with InternalError, using the app not at all', async () => {
    const { app, uses } = standInContacts()

    const error = await rejectionOf(
      actionTitle(
        app,
        { with: 'email', for: PERSON_BY_NAME },
        {
          with: required({ kind: 'unknown' }),
          for: required(PERSON_REF),
        }
      )
    )

    expect(error).toBeInstanceOf(InternalError)
    expect(uses).toEqual([])
  })

  it.each([
    ['after', { for: required(PERSON_REF), count: required(INTEGER) }],
    ['before', { count: required(INTEGER), for: required(PERSON_REF) }],
  ])(
    'fails an invalid value %s a reference with ValidationError, using the app not at all',
    async (_label, fields) => {
      const { app, uses } = standInContacts()

      const error = await rejectionOf(
        actionTitle(
          app,
          { with: 'email', for: PERSON, count: 'seven' },
          {
            with: required({ kind: 'unknown' }),
            ...fields,
          }
        )
      )

      expect(error).toBeInstanceOf(ValidationError)
      expect(uses).toEqual([])
    }
  )
})
