/**
 * Integration: the resource table of every real contract lists only the
 * resources a reference can resolve through, and its type is part of the
 * contract's public API.
 *
 * A reference resolves through the operation its resource records for its
 * cardinality: `get` for a single object, a container, and an
 * identity-collection entry; `list` for a collection (phases/13 D7,
 * "Resolvable targets"). A resource with neither can be named by no valid
 * reference, so a generated table leaves it out, and a reference value type
 * pointing at it rejects every reference to it in both directions.
 *
 * Xcode is the real case checked by hand: its manifest declares `Device` with
 * no commands, and a run destination's `device` and `companionDevice` fields
 * are references to one.
 *
 * The api-report check reads each app's committed `contract.api.md`, which
 * API Extractor writes from the contract's public declarations: the table's
 * type is exported as `<App>Resources`, so the report shows it, and no type
 * the contract's declarations name is left unexported (no forgotten-export
 * warning at all).
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D7)
 * @see https://api-extractor.com/pages/messages/ae-forgotten-export/
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { ValueTypes as t, type DecodeContext } from '@macts/contracts'
import { xcodeContract } from '@macts/xcode/contract'
import { APP_NAMES, loadRealApps, type RealApp } from '../src/real-contracts.js'

/** The repository's `packages/` directory, where each app package lives. */
const PACKAGES_DIR = fileURLToPath(new URL('../../../packages/', import.meta.url))

/** A decode context for values that must fail before binding anything. */
const NO_BINDING: DecodeContext = {
  bindReference() {
    throw new Error('a rejected reference was bound')
  },
  bindFile() {
    throw new Error('no file values here')
  },
}

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

describe('the resource table of every real contract', () => {
  it('lists only resources that record a get or a list operation', () => {
    expect(apps.map(({ name }) => name)).toEqual(APP_NAMES)
    const unresolvable = apps.flatMap(({ name, contract }) =>
      Object.entries(contract.resources)
        .filter(([, entry]) => entry.get === undefined && entry.list === undefined)
        .map(([key]) => `${name}: ${key}`)
    )
    expect(unresolvable).toEqual([])
  })

  it('records only operations of the contract', () => {
    const dangling = apps.flatMap(({ name, contract }) =>
      Object.entries(contract.resources).flatMap(([key, entry]) =>
        [entry.get, entry.list]
          .filter((id) => id !== undefined && !Object.hasOwn(contract.operations, id))
          .map((id) => `${name}: ${key} -> ${String(id)}`)
      )
    )
    expect(dangling).toEqual([])
  })

  it.each(APP_NAMES)('is declared by an exported type in the %s api-report', (app) => {
    const report = readFileSync(`${PACKAGES_DIR}${app}/api-report/contract.api.md`, 'utf-8')
    // No type the contract's declarations name is left unexported.
    expect(report).not.toMatch(/ae-forgotten-export/)
    expect(report).toMatch(/^export type \w+Resources = Readonly<[{R]/m)
    expect(report).toMatch(/^export const \w+Contract: AppContract<\w+Client, \w+Resources>;$/m)
  })
})

describe('Xcode references to a device, which Xcode can neither get nor list', () => {
  const { record } = xcodeContract.resources.RunDestination
  const destination = {
    name: 'My Mac',
    architecture: 'arm64',
    platform: 'macosx',
    device: null,
    companionDevice: null,
  }
  const toDevice = {
    app: 'xcode',
    resource: 'Device',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'name', name: 'My Mac' },
  } as const

  it('leave Device out of the resource table', () => {
    expect(Object.hasOwn(xcodeContract.resources, 'Device')).toBe(false)
  })

  it('are rejected when encoding, in either field and any form', () => {
    expect(record.encode(destination).ok).toBe(true)
    const byIdentity = { ...toDevice, form: 'identity', id: 'D1' }
    for (const [field, reference] of [
      ['device', toDevice],
      ['companionDevice', toDevice],
      ['device', byIdentity],
    ] as const) {
      const result = record.encode({ ...destination, [field]: reference })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues).toEqual([
          {
            path: [field],
            code: 'unsupported',
            message:
              'The app has no resource "Device" that references can resolve through ' +
              '(one with a get or list operation), so a reference to it cannot be encoded.',
          },
        ])
      }
    }
  })

  it('are rejected when decoding', () => {
    const { app: _app, ...wire } = toDevice
    const result = record.decode(
      {
        name: 'My Mac',
        architecture: null,
        platform: null,
        device: { reference: wire },
        companionDevice: null,
      },
      NO_BINDING
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues.map(({ path, code }) => ({ path, code }))).toEqual([
        { path: ['device'], code: 'unsupported' },
      ])
  })

  it('reject a reference built directly against the contract', () => {
    const device = t.reference(() => xcodeContract, 'Device', 'one')
    expect(device.encode(toDevice).ok).toBe(false)
  })
})
