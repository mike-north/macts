/**
 * Regression tests for error handling in {@link explainScope}.
 *
 * `explainScope` tolerates the two KNOWN failure modes of `expandPermissions`
 * (`PermissionParseError`, `PermissionExpansionError`) by falling back to a
 * literal membership check. Any OTHER error must propagate — swallowing it
 * would hide real bugs behind a silently-incomplete explanation.
 *
 * This file mocks `./expander.js` so `expandPermissions` throws an unexpected
 * error; it lives in its own module so the mock does not leak into the main
 * `explain.test.ts` suite.
 *
 * @see packages/core/src/permissions/explain.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AppManifest } from '../manifest/schemas/app.js'

// The real expander module — we re-export the genuine error classes so that
// `instanceof` checks inside explainScope still behave correctly, and only
// override `expandPermissions`.
const expanderActual = await vi.importActual<typeof import('./expander.js')>('./expander.js')

// A controllable stub for expandPermissions.
const expandPermissionsMock = vi.fn<typeof expanderActual.expandPermissions>()

vi.mock('./expander.js', () => ({
  ...expanderActual,
  expandPermissions: (...args: Parameters<typeof expanderActual.expandPermissions>) =>
    expandPermissionsMock(...args),
}))

// Import AFTER the mock is registered so explainScope binds to the stub.
const { explainScope } = await import('./explain.js')

const MANIFEST: AppManifest = {
  version: '1.0',
  app: { bundleId: 'com.example.testapp', name: 'testapp', tccEntitlements: [] },
  suites: [],
  resources: {
    Event: { name: 'Event', plural: 'Events', description: 'd', properties: {} },
  },
  enums: {},
  hierarchy: { children: {} },
  relationships: [],
  commands: {},
  permissions: {
    events: { read: ['testapp:events:list'] },
  },
}

describe('explainScope error propagation', () => {
  beforeEach(() => {
    expandPermissionsMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rethrows an UNEXPECTED error from expandPermissions (does not swallow it)', () => {
    // A plain Error is neither PermissionParseError nor PermissionExpansionError,
    // so it represents an unexpected internal failure and must propagate.
    const boom = new Error('unexpected internal failure')
    expandPermissionsMock.mockImplementation(() => {
      throw boom
    })

    expect(() => explainScope(['testapp:events:list'], MANIFEST)).toThrow(boom)
  })

  it('swallows a known PermissionExpansionError and falls back to membership', () => {
    // A PermissionExpansionError is a known, expected failure; explainScope
    // should NOT rethrow it. The pattern is a declared fine permission, so the
    // fallback grants it.
    expandPermissionsMock.mockImplementation(() => {
      throw new expanderActual.PermissionExpansionError(
        'testapp:events:list',
        'simulated expansion failure'
      )
    })

    const explanation = explainScope(['testapp:events:list'], MANIFEST)
    // Fallback membership check resolves the declared fine permission.
    const events = explanation.resources.find((r) => r.resource === 'events')
    expect(events?.granted.some((op) => op.operation === 'list')).toBe(true)
    expect(explanation.grantsNothing).toBe(false)
  })
})
