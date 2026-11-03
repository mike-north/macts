/**
 * Integration: no real contract client offers a method for an operation that
 * cannot be called.
 *
 * An operation whose required input admits no value is marked `unavailable`
 * (phases/13 D7, "Resolvable targets"). Its descriptor stays in the contract's
 * `operations`, but no generated surface offers it, the contract client
 * included: a method would type-check and then fail on every call.
 *
 * Every real contract is bound to a recording client runtime and every method
 * of its client is called once, so each method reports the operation it
 * invokes. No method may invoke an unavailable operation. The type checks at
 * the end pin the same for the client interfaces, which `tsc` checks.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D7)
 */

import { beforeAll, describe, expect, it } from 'vitest'
import type { ClientRuntime, OperationId } from '@macts/contracts'
import type { ContactsClient } from '@macts/contacts/contract'
import type { MailClient } from '@macts/mail/contract'
import { loadRealApps, type RealApp } from '../src/real-contracts.js'

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

/** Whether a value is a plain object, such as a client namespace. */
function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null
}

/**
 * The operation id every method of an app's client invokes, keyed by the
 * method's path (`method` or `namespace.method`).
 */
async function invokedOperations(app: RealApp): Promise<Map<string, OperationId>> {
  /** The operations invoked since the last method call began. */
  const invoked: OperationId[] = []
  const runtime: ClientRuntime = {
    invoke(operation) {
      invoked.push(operation.id)
      return Promise.resolve(undefined as never)
    },
  }
  const client = app.contract.bind(runtime)
  if (!isObject(client)) throw new Error(`${app.name}: the client is not an object`)
  const methods = new Map<string, OperationId>()
  const call = async (path: string, method: (...args: unknown[]) => unknown): Promise<void> => {
    invoked.length = 0
    await method()
    const [only] = invoked
    if (only === undefined || invoked.length !== 1) {
      throw new Error(`${app.name}: ${path} invoked ${String(invoked.length)} operations, not one`)
    }
    methods.set(path, only)
  }
  for (const [name, member] of Object.entries(client)) {
    if (typeof member === 'function') {
      await call(name, member as (...args: unknown[]) => unknown)
    } else if (isObject(member)) {
      for (const [methodName, method] of Object.entries(member)) {
        if (typeof method !== 'function') throw new Error(`${app.name}: ${name}.${methodName}`)
        await call(`${name}.${methodName}`, method as (...args: unknown[]) => unknown)
      }
    }
  }
  return methods
}

describe('the client of every real contract', () => {
  it('has no method for an operation marked unavailable', async () => {
    let methods = 0
    for (const app of apps) {
      for (const [path, id] of await invokedOperations(app)) {
        methods++
        const operation = app.contract.operations[id]
        expect(operation, `${app.name}: ${path} invokes "${id}"`).toBeDefined()
        expect(operation?.unavailable, `${app.name}: ${path} is unavailable`).toBeUndefined()
      }
    }
    // A floor, so an empty load cannot make the check vacuous.
    expect(methods).toBeGreaterThan(apps.length)
  })

  it('leaves out exactly the Contacts and Mail methods whose required input admits no value', async () => {
    const byApp = new Map(apps.map((app) => [app.name, app]))
    const methodsOf = async (name: string): Promise<string[]> => {
      const app = byApp.get(name)
      if (app === undefined) throw new Error(`no ${name} app`)
      return [...(await invokedOperations(app)).keys()]
    }
    // Hand-written from manifests/contacts/app.yaml and manifests/mail/app.yaml:
    // the required `for` (a person) and `with` (an account) take resources
    // that neither app can get. The operations' siblings stay.
    const contacts = await methodsOf('contacts')
    expect(contacts).not.toContain('actionTitle')
    expect(contacts).not.toContain('performAction')
    expect(contacts).not.toContain('shouldEnableAction')
    expect(contacts).toContain('actionProperty')
    const mail = await methodsOf('mail')
    expect(mail).not.toContain('synchronize')
    expect(mail).toContain('checkForNewMail')
  })
})

// The client interfaces have no such members either.
type HasMember<Client, Name extends string> = Name extends keyof Client ? true : false
const contactsMembers: [
  HasMember<ContactsClient, 'actionTitle'>,
  HasMember<ContactsClient, 'performAction'>,
  HasMember<ContactsClient, 'shouldEnableAction'>,
  HasMember<ContactsClient, 'actionProperty'>,
] = [false, false, false, true]
const mailMembers: [
  HasMember<MailClient, 'synchronize'>,
  HasMember<MailClient, 'checkForNewMail'>,
] = [false, true]
void contactsMembers
void mailMembers
