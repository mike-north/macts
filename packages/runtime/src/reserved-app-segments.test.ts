/**
 * Tests that the runtime refuses to register an app whose route segment is
 * reserved for a namespace macts serves beside the apps.
 *
 * Expected behavior is written by hand from phases/13: `references`,
 * `transfers`, `introspect` and `rpc` are never app route segments (D5, D7), and
 * registration is atomic, so a refused app adds no operations (D5).
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest } from '@macts/core'
import type {
  AnyOperationDescriptor,
  AppContract,
  OperationId,
  PermissionString,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import { OperationRegistrationError, RESERVED_APP_ROUTE_SEGMENTS } from './operations/registry.js'
import { createRuntime, type MactsRuntime } from './runtime.js'
import {
  CALENDAR_MANIFEST,
  LIBRARY_MANIFEST,
  createFakeVerifier,
  createRecordingExecutor,
  libraryContract,
} from './runtime-test-helpers.js'

/** The reserved segments, spelled out from the decision record. */
const RESERVED = ['introspect', 'rpc', 'references', 'transfers'] as const

/** A runtime with the calendar app registered from its manifest. */
function runtimeWithCalendar(): MactsRuntime {
  const runtime = createRuntime({
    executor: createRecordingExecutor(),
    verifier: createFakeVerifier({}),
    governance: { policy: ALLOW_ALL_POLICY },
  })
  runtime.registerManifest(CALENDAR_MANIFEST)
  return runtime
}

/** An operation id with its app segment replaced by `segment`. */
function rebrandId(id: OperationId, segment: string): OperationId {
  const [, scope = '', ...operation] = id.split('.')
  return `${segment}.${scope}.${operation.join('.')}`
}

/** A permission with its app segment replaced by `segment`. */
function rebrandPermission(permission: PermissionString, segment: string): PermissionString {
  const [, scope = '', ...operation] = permission.split(':')
  return `${segment}:${scope}:${operation.join(':')}`
}

/**
 * The library fixture under another app name: a manifest whose `app.name` is
 * `appName`, and a contract consistent with it in every respect, so the app
 * name is the only thing that can make registration fail.
 */
function libraryAs(appName: string): {
  readonly manifest: AppManifest
  readonly contract: AppContract<unknown>
} {
  const segment = appName.toLowerCase()
  const library = libraryContract()
  const operations = Object.values(library.operations).map(
    (op): AnyOperationDescriptor => ({
      ...op,
      id: rebrandId(op.id, segment),
      permission: rebrandPermission(op.permission, segment),
    })
  )
  const resources = Object.fromEntries(
    Object.entries(library.resources).map(([key, resource]) => [
      key,
      {
        ...resource,
        ...(resource.get === undefined ? {} : { get: rebrandId(resource.get, segment) }),
        ...(resource.list === undefined ? {} : { list: rebrandId(resource.list, segment) }),
      },
    ])
  )
  const manifest: AppManifest = {
    ...LIBRARY_MANIFEST,
    app: { ...LIBRARY_MANIFEST.app, name: appName },
  }
  return {
    manifest,
    contract: {
      ...library,
      app: segment,
      operations: Object.fromEntries(operations.map((op) => [op.id, op])),
      resources,
      loadManifest: () => Promise.resolve(manifest),
    },
  }
}

describe('RESERVED_APP_ROUTE_SEGMENTS', () => {
  it('names exactly introspect, rpc, references and transfers', () => {
    expect([...RESERVED_APP_ROUTE_SEGMENTS].sort()).toEqual([...RESERVED].sort())
  })
})

describe('registration of a reserved app route segment', () => {
  it('registers the fixture under a name that is not reserved', () => {
    // The control: the rebranded fixture is valid, so a refusal below is
    // caused by the name alone.
    const runtime = runtimeWithCalendar()
    const { manifest, contract } = libraryAs('Archive')

    runtime.registerContract(contract, manifest)

    expect(runtime.operation('archive.books.list')).toBeDefined()
  })

  it.each(RESERVED)('registerManifest refuses an app named "%s", adding nothing', (name) => {
    const runtime = runtimeWithCalendar()
    const before = runtime.operations()
    const { manifest } = libraryAs(name)

    expect(() => {
      runtime.registerManifest(manifest)
    }).toThrow(OperationRegistrationError)
    expect(() => {
      runtime.registerManifest(manifest)
    }).toThrow(`its route segment "${name}" is reserved`)
    expect(runtime.operations()).toEqual(before)
  })

  it.each(RESERVED)('registerContract refuses an app named "%s", adding nothing', (name) => {
    const runtime = runtimeWithCalendar()
    const before = runtime.operations()
    const { manifest, contract } = libraryAs(name)

    expect(() => {
      runtime.registerContract(contract, manifest)
    }).toThrow(OperationRegistrationError)
    expect(() => {
      runtime.registerContract(contract, manifest)
    }).toThrow(`its route segment "${name}" is reserved`)
    expect(runtime.operations()).toEqual(before)
  })

  it.each([
    ['Introspect', 'introspect'],
    ['RPC', 'rpc'],
    ['Rpc', 'rpc'],
    ['References', 'references'],
    ['TRANSFERS', 'transfers'],
  ])(
    'compares the normalized segment, so "%s" is refused as "%s" on both paths',
    (name, segment) => {
      const runtime = runtimeWithCalendar()
      const before = runtime.operations()
      const { manifest, contract } = libraryAs(name)

      expect(() => {
        runtime.registerContract(contract, manifest)
      }).toThrow(`its route segment "${segment}" is reserved`)
      expect(() => {
        runtime.registerManifest(manifest)
      }).toThrow(`its route segment "${segment}" is reserved`)
      expect(runtime.operations()).toEqual(before)
    }
  )

  it('explains why the name is reserved', () => {
    const runtime = runtimeWithCalendar()

    expect(() => {
      runtime.registerManifest(libraryAs('transfers').manifest)
    }).toThrow(
      'App "transfers" cannot be registered: its route segment "transfers" is reserved for the routes macts serves beside the apps (reserved: introspect, rpc, references, transfers)'
    )
  })

  it('leaves the app free to register under a name that is not reserved after a refusal', () => {
    const runtime = runtimeWithCalendar()
    const refused = libraryAs('references')
    expect(() => {
      runtime.registerContract(refused.contract, refused.manifest)
    }).toThrow(OperationRegistrationError)

    // Nothing of the refused contract was recorded, including its claim on
    // the library resource table.
    const accepted = libraryAs('Reference')
    runtime.registerContract(accepted.contract, accepted.manifest)

    expect(runtime.operation('reference.books.list')).toBeDefined()
    expect(runtime.operation('references.books.list')).toBeUndefined()
  })
})
