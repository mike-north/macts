/**
 * Unit tests for the runtime identifier probe.
 *
 * All JXA execution is injected via fake runners — no real apps or TCC grants
 * are needed.  The tests cover:
 *   - Happy path: a working identifier is recorded as `runtimeIdentifier`
 *   - Calendar-like regression: `calendarIdentifier` throws, `name` succeeds
 *   - Empty collection: probe status is `no-items`
 *   - All candidates fail: probe status is `failed`
 *   - Collection read error: probe status is `error`
 *   - Filtering to specific resources
 *   - Common fallback properties (`name`, `id`) when no declared identifier works
 *
 * @see https://github.com/mike-north/macts/issues/82
 */

import { describe, it, expect } from 'vitest'
import { probeManifest } from './probe.js'
import type { JxaRunner } from './probe.js'
import type { AppManifest } from '../manifest/schemas/app.js'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Fixed probe timestamp used across all tests for determinism */
const PROBE_TIME = '2024-03-15T10:00:00.000Z'

/** Minimal valid AppManifest used as a test fixture base */
function makeManifest(
  overrides: Partial<Pick<AppManifest, 'resources'>> & {
    bundleId?: string
    appName?: string
  } = {}
): AppManifest {
  return {
    version: '1.0',
    app: {
      bundleId: overrides.bundleId ?? 'com.example.TestApp',
      name: overrides.appName ?? 'TestApp',
      tccEntitlements: [],
    },
    suites: [],
    resources: overrides.resources ?? {
      Widget: {
        name: 'Widget',
        plural: 'widgets',
        description: 'A widget',
        properties: {
          name: { access: 'r', type: 'string', description: 'The widget name', optional: false },
          widgetId: {
            access: 'r',
            type: 'string',
            description: 'The widget identifier',
            optional: false,
          },
        },
        identifiers: [{ property: 'widgetId', primary: true }],
      },
    },
    enums: {},
    hierarchy: { children: {} },
    relationships: [],
    commands: {},
  }
}

/**
 * Build a fake JxaRunner whose behaviour per call can be scripted.
 *
 * The probe module makes two types of JXA calls:
 *   1. **Collection-length check** — contains `return items ? items.length : 0`
 *      (unique to `probeCollectionLength`).  Script via the `'__length__'` key.
 *   2. **Property probe** — contains `var first = items[0]` and
 *      `first.<property>`.  Script via `'<property>'` (bare property name).
 *
 * Matching is type-aware to avoid accidental collisions (a property named
 * `length` would otherwise match both calls).
 */
function makeFakeRunner(config: Record<string, { returns?: unknown; throws?: string }>): JxaRunner {
  return (_bundleId: string, jsBody: string): Promise<unknown> => {
    // Discriminate call type so property keys don't match the length-check body
    const isLengthCheck = jsBody.includes('return items ? items.length : 0')

    for (const [key, action] of Object.entries(config)) {
      let matches: boolean
      if (key === '__length__') {
        matches = isLengthCheck
      } else {
        // Property probe: key is the property name; match only in property-probe bodies
        matches = !isLengthCheck && jsBody.includes(`first.${key}`)
      }

      if (matches) {
        if (action.throws !== undefined) {
          return Promise.reject(new Error(action.throws))
        }
        return Promise.resolve(action.returns)
      }
    }
    // Default: return null (no item found / no script matched)
    return Promise.resolve(null)
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('probeManifest', () => {
  // ----- Happy path ---------------------------------------------------------

  it('records runtimeIdentifier when the declared identifier works', async () => {
    // widgetId() returns a value → should be selected
    const runner = makeFakeRunner({
      __length__: { returns: 1 }, // length check
      widgetId: { returns: 'abc-123' },
    })

    const result = await probeManifest(makeManifest(), runner, { now: PROBE_TIME })

    expect(result.resources['Widget']?.runtimeIdentifier).toBe('widgetId')
    expect(result.resources['Widget']?.probe.status).toBe('probed')
    expect(result.resources['Widget']?.probe.runtimeIdentifier).toBe('widgetId')
    expect(result.resources['Widget']?.probe.probedAt).toBe(PROBE_TIME)
  })

  // ----- Calendar-like regression (issue #82) --------------------------------

  it('flags calendarIdentifier as failing and records name as runtimeIdentifier — Calendar-like case', async () => {
    const calendarManifest = makeManifest({
      bundleId: 'com.apple.iCal',
      appName: 'Calendar',
      resources: {
        Calendar: {
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: {
            name: { access: 'rw', type: 'string', description: 'Calendar name', optional: false },
            calendarIdentifier: {
              access: 'r',
              type: 'string',
              description: 'Unique calendar key',
              optional: false,
            },
          },
          identifiers: [{ property: 'calendarIdentifier', primary: true }],
        },
      },
    })

    // calendarIdentifier throws "AppleEvent handler failed"; name works
    const runner = makeFakeRunner({
      __length__: { returns: 2 },
      calendarIdentifier: { throws: 'AppleEvent handler failed. (-10000)' },
      name: { returns: 'Home' },
    })

    const result = await probeManifest(calendarManifest, runner, { now: PROBE_TIME })
    const cal = result.resources['Calendar']

    // Regression assertion: the probe must identify `name` as the working identifier
    expect(cal?.runtimeIdentifier).toBe('name')
    expect(cal?.probe.status).toBe('probed')
    expect(cal?.probe.runtimeIdentifier).toBe('name')

    // calendarIdentifier must be recorded as failed
    const calIdResult = cal?.candidates.find((c) => c.property === 'calendarIdentifier')
    expect(calIdResult?.succeeded).toBe(false)
    expect(calIdResult?.error).toContain('AppleEvent handler failed')

    // name must be recorded as succeeded
    const nameResult = cal?.candidates.find((c) => c.property === 'name')
    expect(nameResult?.succeeded).toBe(true)
  })

  // ----- Empty collection ---------------------------------------------------

  it('sets status to no-items when the collection is empty', async () => {
    const runner = makeFakeRunner({
      __length__: { returns: 0 },
    })

    const result = await probeManifest(makeManifest(), runner, { now: PROBE_TIME })

    expect(result.resources['Widget']?.probe.status).toBe('no-items')
    expect(result.resources['Widget']?.runtimeIdentifier).toBeUndefined()
    expect(result.resources['Widget']?.candidates).toHaveLength(0)
  })

  // ----- All candidates fail ------------------------------------------------

  it('sets status to failed when every candidate returns null/throws', async () => {
    const runner = makeFakeRunner({
      __length__: { returns: 3 },
      widgetId: { returns: null },
      name: { returns: null },
      id: { returns: null },
    })

    const result = await probeManifest(makeManifest(), runner, { now: PROBE_TIME })

    expect(result.resources['Widget']?.probe.status).toBe('failed')
    expect(result.resources['Widget']?.runtimeIdentifier).toBeUndefined()
    // All candidates tried: widgetId (declared), name, id (fallbacks)
    expect(result.resources['Widget']?.candidates.length).toBeGreaterThanOrEqual(3)
    expect(result.resources['Widget']?.candidates.every((c) => !c.succeeded)).toBe(true)
  })

  // ----- Collection read error ----------------------------------------------

  it('sets status to error when the collection itself cannot be read', async () => {
    // length check throws — distinguish by the exact expression unique to the
    // collection-length probe body (not present in property-probe bodies)
    const runner: JxaRunner = (_bundleId, jsBody) => {
      if (jsBody.includes('return items ? items.length : 0')) {
        return Promise.reject(new Error('Cannot read collection'))
      }
      return Promise.resolve(null)
    }

    const result = await probeManifest(makeManifest(), runner, { now: PROBE_TIME })

    expect(result.resources['Widget']?.probe.status).toBe('error')
    expect(result.resources['Widget']?.runtimeIdentifier).toBeUndefined()
  })

  // ----- Fallback to `name` when no declared identifier works ---------------

  it('falls back to `name` when declared identifiers fail and name works', async () => {
    const manifest = makeManifest({
      resources: {
        Gadget: {
          name: 'Gadget',
          plural: 'gadgets',
          description: 'A gadget',
          properties: {
            gadgetCode: {
              access: 'r',
              type: 'string',
              description: 'Gadget code',
              optional: false,
            },
            name: { access: 'r', type: 'string', description: 'Gadget name', optional: false },
          },
          identifiers: [{ property: 'gadgetCode', primary: true }],
        },
      },
    })

    const runner = makeFakeRunner({
      __length__: { returns: 1 },
      gadgetCode: { returns: null }, // declared identifier returns nothing
      name: { returns: 'Whirligig' },
    })

    const result = await probeManifest(manifest, runner, { now: PROBE_TIME })

    expect(result.resources['Gadget']?.runtimeIdentifier).toBe('name')
  })

  // ----- Resource filtering -------------------------------------------------

  it('probes only the requested resources when options.resources is provided', async () => {
    const manifest = makeManifest({
      resources: {
        Alpha: {
          name: 'Alpha',
          plural: 'alphas',
          description: 'Alpha resource',
          properties: {},
          identifiers: [{ property: 'alphaId', primary: true }],
        },
        Beta: {
          name: 'Beta',
          plural: 'betas',
          description: 'Beta resource',
          properties: {},
          identifiers: [{ property: 'betaId', primary: true }],
        },
      },
    })

    const probed: string[] = []
    const runner: JxaRunner = (_bundleId, jsBody) => {
      if (jsBody.includes('alphas')) probed.push('Alpha')
      if (jsBody.includes('betas')) probed.push('Beta')
      if (jsBody.includes('return items ? items.length : 0')) return Promise.resolve(1)
      return Promise.resolve('some-id')
    }

    await probeManifest(manifest, runner, { now: PROBE_TIME, resources: ['Alpha'] })

    expect(probed.some((r) => r === 'Alpha')).toBe(true)
    expect(probed.some((r) => r === 'Beta')).toBe(false)
  })

  // ----- AppProbeResult shape -----------------------------------------------

  it('includes bundleId, appName, and probedAt in the top-level result', async () => {
    const runner = makeFakeRunner({
      __length__: { returns: 1 },
      widgetId: { returns: 'w-1' },
    })

    const result = await probeManifest(
      makeManifest({ bundleId: 'com.example.App', appName: 'MyApp' }),
      runner,
      { now: PROBE_TIME }
    )

    expect(result.bundleId).toBe('com.example.App')
    expect(result.appName).toBe('MyApp')
    expect(result.probedAt).toBe(PROBE_TIME)
  })

  // ----- Primary identifier tried before non-primary -------------------------

  it('tries the primary identifier before non-primary ones', async () => {
    const manifest = makeManifest({
      resources: {
        Item: {
          name: 'Item',
          plural: 'items',
          description: 'An item',
          properties: {},
          identifiers: [
            { property: 'secondaryId', primary: false },
            { property: 'primaryId', primary: true },
          ],
        },
      },
    })

    const tryOrder: string[] = []
    const runner: JxaRunner = (_bundleId, jsBody) => {
      if (jsBody.includes('return items ? items.length : 0')) return Promise.resolve(1)
      // Record which property is being probed via the JS body
      // The property probe body contains `first.<property>()` — extract the name
      const match = /first\.(\w+)\(\)/.exec(jsBody)
      if (match?.[1]) tryOrder.push(match[1])
      return Promise.resolve('ok')
    }

    await probeManifest(manifest, runner, { now: PROBE_TIME })

    const primaryIdx = tryOrder.indexOf('primaryId')
    const secondaryIdx = tryOrder.indexOf('secondaryId')
    expect(primaryIdx).toBeGreaterThanOrEqual(0)
    expect(secondaryIdx).toBeGreaterThanOrEqual(0)
    expect(primaryIdx).toBeLessThan(secondaryIdx)
  })

  // ----- Duplicate fallbacks not added when already declared -----------------

  it('does not duplicate name in candidates when name is already a declared identifier', async () => {
    const manifest = makeManifest({
      resources: {
        Tag: {
          name: 'Tag',
          plural: 'tags',
          description: 'A tag',
          properties: {
            name: { access: 'r', type: 'string', description: 'Tag name', optional: false },
          },
          identifiers: [{ property: 'name', primary: true }],
        },
      },
    })

    const runner = makeFakeRunner({
      __length__: { returns: 1 },
      name: { returns: 'work' },
    })

    const result = await probeManifest(manifest, runner, { now: PROBE_TIME })
    const nameCount = result.resources['Tag']?.candidates.filter(
      (c) => c.property === 'name'
    ).length

    // `name` appears exactly once even though it's declared AND a fallback
    expect(nameCount).toBe(1)
    expect(result.resources['Tag']?.runtimeIdentifier).toBe('name')
  })
})
