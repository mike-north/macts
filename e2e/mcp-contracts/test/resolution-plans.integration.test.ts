/**
 * Integration: in every real contract, a resource's get record and list item
 * have the same plan.
 *
 * A single reference resolves to the resource's get output, and an identity
 * collection to an array of its list's page items (phases/13 D7). The macOS
 * provider reads both with the get body's record read (D7, native conversion
 * scope), which is correct only while the two plans are equal. This test
 * holds every shipped contract to that, for every resource with both a get
 * and a list; a resource with only one of them has nothing to compare.
 *
 * The comparison itself is checked first on hand-built descriptors, so the
 * test over the real contracts cannot pass by comparing nothing.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7, D9)
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  ValueTypes as t,
  type AnyOperationDescriptor,
  type OperationId,
  type ValueType,
} from '@macts/contracts'
import { loadRealApps, type RealApp } from '../src/real-contracts.js'
import { compareResolutionPlans, type ResolvableResource } from '../src/resolution-plans.js'

/** One hand-built book operation, `library.books.<command>`, with output `output`. */
function operation(command: string, output: ValueType<unknown>): AnyOperationDescriptor {
  return {
    id: `library.books.${command}`,
    permission: `library:books:${command}`,
    target: { command, resource: 'Book' },
    description: command,
    input: t.record({}),
    output,
  }
}

const BOOK = t.record({ isbn: t.string(), title: t.string() })
const BOOK_WITH_PAGES = t.record({
  isbn: t.string(),
  title: t.nullable(t.string()),
  pages: t.integer(),
})

const OPERATIONS: Readonly<Record<OperationId, AnyOperationDescriptor>> = {
  'library.books.get': operation('get', BOOK),
  'library.books.list': operation('list', t.page(BOOK)),
  'library.books.listWide': operation('listWide', t.page(BOOK_WITH_PAGES)),
}

describe('compareResolutionPlans', () => {
  it('finds no difference when the get record and the list item are the same record', () => {
    expect(
      compareResolutionPlans(
        { name: 'Book', get: 'library.books.get', list: 'library.books.list' },
        OPERATIONS
      )
    ).toEqual({ compared: true, differences: [] })
  })

  it('names the resource and each difference when they are not', () => {
    const comparison = compareResolutionPlans(
      { name: 'Book', get: 'library.books.get', list: 'library.books.listWide' },
      OPERATIONS
    )

    expect(comparison).toEqual({
      compared: true,
      differences: [
        'Book (get library.books.get, list library.books.listWide): fields.pages is only in the list item: {"presence":"required","value":{"kind":"integer"}}',
        'Book (get library.books.get, list library.books.listWide): fields.title.value.kind is "string" in the get record but "nullable" in the list item',
        'Book (get library.books.get, list library.books.listWide): fields.title.value.value is only in the list item: {"kind":"string"}',
      ],
    })
  })

  it.each<[ResolvableResource, string]>([
    [{ name: 'Book', get: 'library.books.get' }, 'Book has a get and no list'],
    [{ name: 'Book', list: 'library.books.list' }, 'Book has no get and a list'],
    [{ name: 'Book' }, 'Book has no get and no list'],
  ])('does not compare a resource without both: %o', (resource, reason) => {
    expect(compareResolutionPlans(resource, OPERATIONS)).toEqual({ compared: false, reason })
  })

  it('fails for a resource whose recorded operation the contract lacks', () => {
    expect(() =>
      compareResolutionPlans(
        { name: 'Book', get: 'library.books.missing', list: 'library.books.list' },
        OPERATIONS
      )
    ).toThrow('The contract has no operation "library.books.missing"')
  })
})

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

describe('every real contract', () => {
  it('gives each resource with a get and a list the same get record and list item plan', () => {
    const differences: string[] = []
    let compared = 0
    let notCompared = 0
    for (const app of apps) {
      for (const resource of Object.values(app.contract.resources)) {
        const comparison = compareResolutionPlans(resource, app.contract.operations)
        if (!comparison.compared) {
          notCompared++
          continue
        }
        compared++
        differences.push(
          ...comparison.differences.map((difference) => `${app.name}: ${difference}`)
        )
      }
    }

    expect(differences, differences.join('\n')).toEqual([])
    // Guards against comparing nothing: the shipped contracts have many
    // resources with both, and some with only one of the two.
    expect(compared).toBeGreaterThan(10)
    expect(notCompared).toBeGreaterThan(0)
  })
})
