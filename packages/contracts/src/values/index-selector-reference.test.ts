/**
 * Unit tests for `t.indexSelectorReference(scope, resource)`: the value type
 * of an output position whose target has no identifier and is found by its
 * zero-based position within its parent.
 *
 * Expected values are written by hand from phases/13 D7 ("Emitted forms") and
 * D11: such a position holds only
 * `{form: 'selector', cardinality: 'one', selector: {by: 'index', index}, container}`,
 * with the container an identity reference to the parent the target's `get`
 * records. Every other form, at that position, is rejected by encoding, by
 * decoding and by the wire schema the runtime checks results against, and
 * the plan records the form the native codec emits.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7, §D9, §D11
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { IssuePath } from '../issues.js'
import type { ReferenceRegistry, ReferenceScope } from '../references/index.js'
import type { CodecResult } from './value-type.js'
import { ValueTypes as t } from './value-types.js'
import { VECTOR_DECODE_CONTEXT, VECTOR_RESOLVE } from './vectors/index.js'

const APP = 'terminal'

/**
 * A terminal app: windows are identified and got at the application; a tab
 * has no identifier and is got within its window by its position. A profile
 * has no identifier and is got at the application, so it has no container to
 * count within.
 */
const REGISTRY: ReferenceRegistry = {
  Window: { id: t.string(), get: 'terminal.windows.get', list: 'terminal.windows.list' },
  Tab: {
    get: 'terminal.tabs.get',
    list: 'terminal.tabs.list',
    parents: { get: 'Window', list: 'Window' },
  },
  Profile: { get: 'terminal.profiles.get' },
}

const SCOPE: ReferenceScope = { app: APP, resources: REGISTRY }
const scope = (): ReferenceScope => SCOPE

const tab = t.indexSelectorReference(scope, 'Tab')

/** The wire form of the window `id`. */
function wireWindow(id: string): object {
  return { resource: 'Window', form: 'identity', cardinality: 'one', id }
}

/** The wire form of the tab at `index` within `container` (window W1 by default; none for `null`). */
function wireTab(index: string, container: object | null = wireWindow('W1')): object {
  return {
    resource: 'Tab',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index: { integer: index } },
    ...(container === null ? {} : { container }),
  }
}

function failures(result: CodecResult<unknown>): { path: IssuePath; message: string }[] {
  if (result.ok) throw new Error('expected a failure')
  return result.issues.map(({ path, message }) => ({ path, message }))
}

const NOT_AN_INDEX_SELECTOR = (received: string): string =>
  'Expected an index selector: a reference to "Tab" at this position is denoted by its ' +
  `zero-based position within its container; received ${received}.`

describe('the plan of an index selector position', () => {
  it('records the index form the native codec emits', () => {
    expect(tab.plan).toEqual({
      kind: 'reference',
      resource: 'Tab',
      cardinality: 'one',
      form: 'index',
    })
  })
})

describe('decoding an index selector position', () => {
  it('decodes an index selector within its window, bound with the window as container', () => {
    const decoded = tab.decode({ reference: wireTab('2') }, VECTOR_DECODE_CONTEXT)
    expect(decoded).toEqual({
      ok: true,
      value: {
        app: APP,
        resource: 'Tab',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: 2 },
        resolve: VECTOR_RESOLVE,
        container: {
          app: APP,
          resource: 'Window',
          form: 'identity',
          cardinality: 'one',
          id: 'W1',
          resolve: VECTOR_RESOLVE,
        },
      },
    })
  })

  it('rejects a name selector, which is not the emitted form', () => {
    const named = {
      ...wireTab('0'),
      selector: { by: 'name', name: 'Build' },
    }
    expect(failures(tab.decode({ reference: named }, VECTOR_DECODE_CONTEXT))).toEqual([
      { path: [], message: NOT_AN_INDEX_SELECTOR('a selector by name') },
    ])
  })

  it('rejects a tab with no container, naming the window it is counted within', () => {
    expect(failures(tab.decode({ reference: wireTab('0', null) }, VECTOR_DECODE_CONTEXT))).toEqual([
      {
        path: ['container'],
        message:
          'The required field "container" is missing; expected an identity reference to the ' +
          '"Window" the "Tab" is in, because the app finds each "Tab" only within its "Window".',
      },
    ])
  })

  it('rejects a negative position', () => {
    expect(tab.decode({ reference: wireTab('-1') }, VECTOR_DECODE_CONTEXT).ok).toBe(false)
  })
})

describe('encoding an index selector position', () => {
  it('writes the index selector and its window container to the wire', () => {
    const data = {
      app: APP,
      resource: 'Tab',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: 1 },
      container: { app: APP, resource: 'Window', form: 'identity', cardinality: 'one', id: 'W1' },
    }
    expect(tab.encode(data)).toEqual({ ok: true, value: { reference: wireTab('1') } })
  })

  it('rejects an identity reference, since a tab has no identifier', () => {
    const identity = { app: APP, resource: 'Tab', form: 'identity', cardinality: 'one', id: 'T1' }
    expect(failures(tab.encode(identity))).toEqual([
      {
        path: [],
        message:
          '"Tab" has no identifier, so it can be referenced only by a selector (name, index, ' +
          'every, or range).',
      },
    ])
  })
})

describe('the wire schema of an index selector position (D11)', () => {
  const admits = (wire: object): boolean => tab.wire.safeParse({ reference: wire }).success

  it('admits only an index selector within an identity window', () => {
    expect(admits(wireTab('0'))).toBe(true)
    expect(admits({ ...wireTab('0'), selector: { by: 'name', name: 'Build' } })).toBe(false)
    expect(admits({ resource: 'Tab', form: 'identity', cardinality: 'one', id: 'T1' })).toBe(false)
    expect(admits(wireTab('0', null))).toBe(false)
    const selectorWindow = {
      resource: 'Window',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '0' } },
    }
    expect(admits(wireTab('0', selectorWindow))).toBe(false)
  })

  it('requires the container in its JSON Schema, with the index selector only', () => {
    const schema = z.toJSONSchema(tab.wire, { target: 'draft-7' })
    const payload = (
      schema.properties as Record<
        string,
        {
          required?: unknown
          properties?: Record<string, { properties?: Record<string, unknown> }>
        }
      >
    )['reference']
    expect(payload?.required).toEqual(['resource', 'form', 'cardinality', 'selector', 'container'])
    expect(payload?.properties?.['selector']?.properties?.['by']).toEqual({
      type: 'string',
      const: 'index',
    })
  })
})

describe('a resource with no container to count within', () => {
  const profile = t.indexSelectorReference(scope, 'Profile')
  const atApplication = {
    resource: 'Profile',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index: { integer: '0' } },
  }

  it('admits nothing, since its get records no parent', () => {
    expect(profile.wire.safeParse({ reference: atApplication }).success).toBe(false)
    expect(failures(profile.decode({ reference: atApplication }, VECTOR_DECODE_CONTEXT))).toEqual([
      {
        path: [],
        message:
          'The app gets one "Profile" without a container, so no reference can denote one by its ' +
          'position within a container.',
      },
    ])
  })
})
