/**
 * Permission & operation-vocabulary coherence — integration tests.
 *
 * These exercise the real key creation -> validation -> permission-check path
 * against the real Calendar manifest's permissions section (the single source
 * of truth for the operation vocabulary). Expectations are derived by hand from
 * the manifest, never from program output.
 *
 * Acceptance-criteria coverage (issue: permission & operation-vocabulary
 * coherence):
 *   - Criterion 2 (documented, tested happy path: a granted scope authorizes a
 *     representative SDK call set — list + create — with no surprise 403):
 *     the "happy path" suite.
 *   - Criterion 3 (denials report the precise missing app:resource:operation):
 *     the "precise denials" suite.
 *   - Criterion 4 (wildcard and --manifest/coarse semantics match the matcher's
 *     actual behavior): the "wildcard semantics" and "coarse expansion" suites.
 *   - Phantom `read` elimination: the "phantom read" suite asserts an
 *     unexpanded coarse `read` scope is rejected at creation rather than
 *     silently authorizing nothing.
 *
 * @see ../../../../manifests/calendar/app.yaml (permissions section)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadManifest, type PermissionsSection } from '@macts/core'
import { createApiKey, UnexpandableCoarsePermissionError } from './generator.js'
import { validateApiKey, checkPayloadPermission } from './validator.js'
import * as storage from './storage.js'

vi.mock('./storage.js', async () => {
  const actual = await vi.importActual<typeof storage>('./storage.js')
  return {
    ...actual,
    getSigningSecret: vi.fn().mockResolvedValue('test-secret-key-for-coherence'),
    addKeyMetadata: vi.fn().mockResolvedValue(undefined),
    generateKeyId: vi.fn().mockReturnValue('key_coherence'),
  }
})

const THIS_FILE = fileURLToPath(import.meta.url)
const CALENDAR_MANIFEST = join(
  dirname(THIS_FILE),
  '..',
  '..',
  '..',
  '..',
  'manifests',
  'calendar',
  'app.yaml'
)

let calendarPermissions: PermissionsSection

beforeEach(async () => {
  vi.clearAllMocks()
  const manifest = await loadManifest(CALENDAR_MANIFEST)
  if (!manifest.permissions) throw new Error('Calendar manifest is missing a permissions section')
  calendarPermissions = manifest.permissions
})

/** Validate a token and return its payload, failing the test if invalid. */
async function payloadOf(token: string) {
  const result = await validateApiKey(token)
  expect(result.valid).toBe(true)
  if (!result.payload) throw new Error('expected a valid payload')
  return result.payload
}

describe('happy path: a granted scope authorizes the representative SDK calls', () => {
  it('a resource wildcard authorizes both events.list() and events.create() with no surprise 403', async () => {
    // events.list() requires calendar:events:list; events.create() requires
    // calendar:events:create (manifest §permissions.events). A resource
    // wildcard must cover both.
    const { token } = await createApiKey({
      name: 'events-wildcard',
      permissions: ['calendar:events:*'],
    })
    const payload = await payloadOf(token)

    expect(checkPayloadPermission(payload, 'calendar:events:list').granted).toBe(true)
    expect(checkPayloadPermission(payload, 'calendar:events:create').granted).toBe(true)
  })

  it('a coarse `read` + explicit create grant authorizes list and create after manifest expansion', async () => {
    // calendar:events:read expands (manifest §permissions.events.read) to
    // list/get/show; create is granted fine-grained. Together they authorize
    // the representative list + create SDK call set.
    const { token, metadata } = await createApiKey(
      {
        name: 'read-plus-create',
        permissions: ['calendar:events:read', 'calendar:events:create'],
      },
      calendarPermissions
    )

    // Expansion is spec-derived from the manifest, not from program output.
    expect(metadata.permissions).toContain('calendar:events:list')
    expect(metadata.permissions).toContain('calendar:events:get')
    expect(metadata.permissions).toContain('calendar:events:show')
    expect(metadata.permissions).toContain('calendar:events:create')

    const payload = await payloadOf(token)
    expect(checkPayloadPermission(payload, 'calendar:events:list').granted).toBe(true)
    expect(checkPayloadPermission(payload, 'calendar:events:create').granted).toBe(true)
  })

  it('fine-grained grants authorize exactly the granted calls', async () => {
    const { token } = await createApiKey({
      name: 'fine',
      permissions: ['calendar:events:list', 'calendar:events:create'],
    })
    const payload = await payloadOf(token)

    expect(checkPayloadPermission(payload, 'calendar:events:list').granted).toBe(true)
    expect(checkPayloadPermission(payload, 'calendar:events:create').granted).toBe(true)
    // No implicit grouping: a sibling op is not authorized.
    expect(checkPayloadPermission(payload, 'calendar:events:delete').granted).toBe(false)
  })
})

describe('precise denials: the exact missing app:resource:operation is named', () => {
  it('names the precise required permission and the resource-wildcard alternative', async () => {
    const { token } = await createApiKey({
      name: 'list-only',
      permissions: ['calendar:events:list'],
    })
    const payload = await payloadOf(token)

    const result = checkPayloadPermission(payload, 'calendar:events:create')
    expect(result.granted).toBe(false)
    expect(result.required).toBe('calendar:events:create')
    // The hint must name the exact missing permission so the fix is one grant.
    expect(result.hint).toContain('calendar:events:create')
    // ...and offer the resource wildcard that would also authorize it.
    expect(result.hint).toContain('calendar:events:*')
  })
})

describe('wildcard semantics: match exactly or via `*` in resource/operation', () => {
  it('app wildcard authorizes every resource and operation', async () => {
    const { token } = await createApiKey({
      name: 'all',
      permissions: ['calendar:*:*'],
    })
    const payload = await payloadOf(token)

    expect(checkPayloadPermission(payload, 'calendar:events:list').granted).toBe(true)
    expect(checkPayloadPermission(payload, 'calendar:calendars:create').granted).toBe(true)
  })

  it('an operation wildcard does not cross resource boundaries', async () => {
    const { token } = await createApiKey({
      name: 'events-only',
      permissions: ['calendar:events:*'],
    })
    const payload = await payloadOf(token)

    expect(checkPayloadPermission(payload, 'calendar:events:list').granted).toBe(true)
    // calendars is a different resource — not covered by calendar:events:*.
    expect(checkPayloadPermission(payload, 'calendar:calendars:list').granted).toBe(false)
  })

  it('the app segment must match exactly even under a wildcard', async () => {
    const { token } = await createApiKey({
      name: 'calendar-all',
      permissions: ['calendar:*:*'],
    })
    const payload = await payloadOf(token)

    expect(checkPayloadPermission(payload, 'reminders:lists:list').granted).toBe(false)
  })
})

describe('coarse expansion via --manifest is predictable', () => {
  it('expands calendar:*:read to all read operations across resources', async () => {
    const { metadata } = await createApiKey(
      { name: 'read-all', permissions: ['calendar:*:read'] },
      calendarPermissions
    )

    // Spec-derived: every resource's `read` mapping contributes list/get.
    expect(metadata.permissions).toContain('calendar:events:list')
    expect(metadata.permissions).toContain('calendar:calendars:list')
    // A coarse alias is never stored verbatim.
    expect(metadata.permissions).not.toContain('calendar:events:read')
    expect(metadata.permissions).not.toContain('calendar:*:read')
  })
})

describe('phantom read elimination: unexpanded coarse scope is rejected, never silently denied', () => {
  it('rejects a coarse `read` permission created without a manifest', async () => {
    await expect(
      createApiKey({ name: 'phantom', permissions: ['calendar:events:read'] })
    ).rejects.toBeInstanceOf(UnexpandableCoarsePermissionError)
  })

  it('rejects a wildcard-resource coarse `read` permission created without a manifest', async () => {
    await expect(
      createApiKey({ name: 'phantom-wild', permissions: ['calendar:*:read'] })
    ).rejects.toBeInstanceOf(UnexpandableCoarsePermissionError)
  })

  it('names the wildcard and fine-grained alternatives in the rejection', async () => {
    let caught: unknown
    try {
      await createApiKey({ name: 'phantom', permissions: ['calendar:events:read'] })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(UnexpandableCoarsePermissionError)
    const message = (caught as Error).message
    expect(message).toContain('calendar:events:*')
    expect(message).toContain('--manifest')
  })

  it('still accepts wildcard operations without a manifest (a `*` op is not coarse)', async () => {
    const { metadata } = await createApiKey({
      name: 'wild-ok',
      permissions: ['calendar:events:*'],
    })
    expect(metadata.permissions).toEqual(['calendar:events:*'])
  })
})
