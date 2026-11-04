/**
 * Integration: for each resource the app lists only within a parent while
 * getting a single one at the application, a collection of every object of
 * the resource needs an identity reference to that parent as its container,
 * over the real generated contracts (phases/13 D7, "Parent-scoped targets").
 *
 * Expected values are written by hand from D7: encoding a selector collection
 * (`by: 'every'`) without a container fails at `container` and names the
 * parent; with an identity reference to the parent it encodes. The resources
 * and parents are the hand-audited pins shared with the parent guard; the
 * compile-time side is checked by
 * `packages/sdk/src/parent-scoped-selector-collections.test-d.ts`.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D7
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { ValueTypes as t } from '@macts/contracts'
import { LIST_ONLY_PINS } from '../src/parent-scoped-pins.js'
import { loadRealApps, type RealApp } from '../src/real-contracts.js'

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

describe('a collection of every object of a list-only-parent resource', () => {
  it.each(LIST_ONLY_PINS.map((pin) => [...pin]))(
    '%s %s needs its %s as its container',
    (appName, resource, parent) => {
      const app = apps.find(({ name }) => name === appName)
      if (app === undefined || resource === undefined || parent === undefined) {
        throw new Error(`no contract for ${String(appName)}`)
      }
      const collection = t.reference(() => app.contract, resource, 'many')
      const every = {
        app: app.contract.app,
        resource,
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'every' },
      }

      const missing = collection.encode(every)
      expect(missing.ok).toBe(false)
      if (!missing.ok) {
        expect(missing.issues.map(({ path, code }) => ({ path, code }))).toEqual([
          { path: ['container'], code: 'missing-field' },
        ])
        expect(missing.issues[0]?.message).toContain(`"${parent}"`)
      }

      const container = {
        app: app.contract.app,
        resource: parent,
        form: 'identity',
        cardinality: 'one',
        id: 'P1',
      }
      expect(collection.encode({ ...every, container }).ok).toBe(true)
    }
  )
})
