/**
 * Runtime tests for the governance policy declaration parser.
 *
 * Expected values are derived by hand from issue #7's spec
 * ("declare apps/operations as allowed / read-only / forbidden / confirm-first;
 * path and URL restrictions; sensitivity tags") and VISION.md §6/§7.3/§10 —
 * never from program output.
 *
 * @see Issue #7 — Trust & Governance: boundaries, permissions, audit.
 */

import { describe, it, expect } from 'vitest'
import {
  parsePolicy,
  POLICY_DISPOSITIONS,
  type GovernancePolicy,
  type PolicyDisposition,
} from './policy.js'

/**
 * A minimal, fully-specified valid declaration used as a base for tests that
 * tweak a single field. Every defaultable field is provided so the base does
 * not rely on defaults the individual tests may be probing.
 */
function baseDeclaration(): unknown {
  return {
    version: '1',
    defaultDisposition: 'forbidden',
    tags: ['org-policy'],
    apps: [
      {
        app: 'calendar',
        disposition: 'read-only',
        tags: ['pii'],
        reason: 'Calendar contains personal data',
        operations: [
          {
            operation: 'create',
            disposition: 'confirm-first',
            tags: ['write'],
            reason: 'mutating',
          },
        ],
        restrictions: {
          pathsAllow: ['/Users/me/work/**'],
          pathsDeny: ['/Users/me/private/**'],
          urlsAllow: ['https://corp.example.com/**'],
          urlsDeny: ['https://*.untrusted.example/**'],
        },
      },
    ],
  }
}

describe('parsePolicy — valid declarations', () => {
  it('accepts a fully-specified declaration and preserves every field', () => {
    const result = parsePolicy(baseDeclaration())
    expect(result.success).toBe(true)
    if (!result.success) return // narrow for TS

    const data: GovernancePolicy = result.data
    // spec: top-level shape
    expect(data.version).toBe('1')
    expect(data.defaultDisposition).toBe('forbidden')
    expect(data.tags).toEqual(['org-policy'])
    expect(data.apps).toHaveLength(1)

    const [app] = data.apps
    expect(app).toBeDefined()
    if (!app) return
    // spec: app rule — app name + app-level disposition + tags + reason
    expect(app.app).toBe('calendar')
    expect(app.disposition).toBe('read-only')
    expect(app.tags).toEqual(['pii'])
    expect(app.reason).toBe('Calendar contains personal data')

    // spec: per-operation override
    expect(app.operations).toHaveLength(1)
    expect(app.operations[0]).toEqual({
      operation: 'create',
      disposition: 'confirm-first',
      tags: ['write'],
      reason: 'mutating',
    })

    // spec: path + URL restrictions, allow and deny kept separate
    expect(app.restrictions).toEqual({
      pathsAllow: ['/Users/me/work/**'],
      pathsDeny: ['/Users/me/private/**'],
      urlsAllow: ['https://corp.example.com/**'],
      urlsDeny: ['https://*.untrusted.example/**'],
    })
  })

  it('applies fail-closed defaults when optional fields are omitted', () => {
    // spec: an empty declaration should default to a fail-closed boundary.
    const result = parsePolicy({})
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).toEqual({
      version: '1',
      defaultDisposition: 'forbidden', // fail-closed default
      apps: [],
      tags: [],
    } satisfies GovernancePolicy)
  })

  it('applies per-app and per-operation defaults', () => {
    const result = parsePolicy({
      apps: [{ app: 'finder', disposition: 'allowed' }],
    })
    expect(result.success).toBe(true)
    if (!result.success) return

    const [app] = result.data.apps
    expect(app).toBeDefined()
    if (!app) return
    expect(app.operations).toEqual([])
    expect(app.tags).toEqual([])
    expect(app.restrictions).toEqual({
      pathsAllow: [],
      pathsDeny: [],
      urlsAllow: [],
      urlsDeny: [],
    })
    // reason is optional and absent (exactOptionalPropertyTypes): key omitted
    expect('reason' in app).toBe(false)
  })

  it.each(POLICY_DISPOSITIONS)('accepts the "%s" disposition', (disposition) => {
    const result = parsePolicy({ apps: [{ app: 'calendar', disposition }] })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.apps[0]?.disposition).toBe<PolicyDisposition>(disposition)
  })

  it('accepts "*" wildcards for app and operation', () => {
    const result = parsePolicy({
      apps: [
        {
          app: '*',
          disposition: 'forbidden',
          operations: [{ operation: '*', disposition: 'forbidden' }],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('exposes the canonical disposition set in least-to-most-restrictive order', () => {
    // spec (issue #7): allowed / read-only / confirm-first / forbidden.
    expect(POLICY_DISPOSITIONS).toEqual(['allowed', 'read-only', 'confirm-first', 'forbidden'])
  })
})

describe('parsePolicy — invalid declarations (negative, one constraint each)', () => {
  it('rejects a non-object input', () => {
    const result = parsePolicy('not an object')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('rejects null', () => {
    const result = parsePolicy(null)
    expect(result.success).toBe(false)
  })

  it('rejects an unknown top-level key (strict schema)', () => {
    const result = parsePolicy({ apps: [], unexpected: true })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => /unexpected|unrecognized/i.test(i.message))).toBe(true)
  })

  it('rejects a wrong version literal', () => {
    const result = parsePolicy({ version: '2', apps: [] })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'version')).toBe(true)
  })

  it('rejects an unknown disposition value', () => {
    const result = parsePolicy({ apps: [{ app: 'calendar', disposition: 'maybe' }] })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps.0.disposition')).toBe(true)
  })

  it('rejects a missing required app disposition', () => {
    const result = parsePolicy({ apps: [{ app: 'calendar' }] })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps.0.disposition')).toBe(true)
  })

  it('rejects an uppercase app name (must be lowercase identifier or "*")', () => {
    const result = parsePolicy({ apps: [{ app: 'Calendar', disposition: 'allowed' }] })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps.0.app')).toBe(true)
  })

  it('rejects an empty app name', () => {
    const result = parsePolicy({ apps: [{ app: '', disposition: 'allowed' }] })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps.0.app')).toBe(true)
  })

  it('rejects an empty operation name', () => {
    const result = parsePolicy({
      apps: [
        {
          app: 'calendar',
          disposition: 'allowed',
          operations: [{ operation: '', disposition: 'allowed' }],
        },
      ],
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps.0.operations.0.operation')).toBe(true)
  })

  it('rejects a sensitivity tag with invalid characters', () => {
    const result = parsePolicy({
      apps: [{ app: 'calendar', disposition: 'allowed', tags: ['Has Spaces'] }],
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps.0.tags.0')).toBe(true)
  })

  it('rejects an empty sensitivity tag', () => {
    const result = parsePolicy({ tags: [''] })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'tags.0')).toBe(true)
  })

  it('rejects an empty path restriction pattern', () => {
    const result = parsePolicy({
      apps: [{ app: 'calendar', disposition: 'allowed', restrictions: { pathsDeny: [''] } }],
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps.0.restrictions.pathsDeny.0')).toBe(true)
  })

  it('rejects an unknown key inside restrictions (strict)', () => {
    const result = parsePolicy({
      apps: [{ app: 'calendar', disposition: 'allowed', restrictions: { pathsBogus: ['/x'] } }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a non-array apps field', () => {
    const result = parsePolicy({ apps: 'calendar' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps')).toBe(true)
  })

  it('rejects an empty reason string (must be non-empty when present)', () => {
    const result = parsePolicy({ apps: [{ app: 'calendar', disposition: 'allowed', reason: '' }] })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((i) => i.path === 'apps.0.reason')).toBe(true)
  })

  it('reports multiple issues at once with dotted paths', () => {
    const result = parsePolicy({
      apps: [
        { app: 'Bad', disposition: 'nope' },
        { app: 'ok', disposition: 'allowed', tags: ['BAD TAG'] },
      ],
    })
    expect(result.success).toBe(false)
    if (result.success) return
    const paths = result.issues.map((i) => i.path)
    expect(paths).toContain('apps.0.app')
    expect(paths).toContain('apps.0.disposition')
    expect(paths).toContain('apps.1.tags.0')
  })
})
