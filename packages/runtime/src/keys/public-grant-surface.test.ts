/**
 * The package's public surface offers no way to write a key's grant.
 *
 * A key's permissions and expiry are signed into its token, and the stored
 * record is the receipt of that grant. These tests import the package entry
 * point, the module the published build is bundled from, and check that:
 *
 * - no export can insert or replace a stored record directly (`createApiKey`
 *   is the only way to store a key, and it stores exactly what it signed);
 * - the exported `updateKeyMetadata` accepts only `name`.
 *
 * `storage.test-d.ts` pins the same update contract at the type level.
 */

import { rmSync } from 'node:fs'
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { ApiKeyMetadata } from '@macts/core'
import * as runtime from '../index.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before the entry point is imported.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-grant-surface-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

afterAll(() => {
  runtime.closeKeyStore()
  rmSync(mactsHome, { recursive: true, force: true })
})

/** Store functions that would write a record's grant directly, bypassing `createApiKey`. */
const GRANT_WRITERS = ['addKeyMetadata', 'saveKeyMetadata'] as const

/**
 * Every field of a stored key record other than `name`, written by hand from
 * `ApiKeyMetadata` so a new field must be considered here when it is added.
 */
const NON_UPDATABLE_FIELDS = [
  'id',
  'permissions',
  'originalPermissions',
  'createdAt',
  'expiresAt',
  'revoked',
  'keyPrefix',
] as const satisfies readonly Exclude<keyof ApiKeyMetadata, 'name'>[]

/** `true` only when {@link NON_UPDATABLE_FIELDS} names every field but `name`; otherwise a type error. */
const listsEveryField: [
  Exclude<keyof ApiKeyMetadata, 'name' | (typeof NON_UPDATABLE_FIELDS)[number]>,
] extends [never]
  ? true
  : never = true

describe('@macts/runtime public surface: key grants', () => {
  it.each(GRANT_WRITERS)('does not export %s', (name) => {
    expect(Object.keys(runtime)).not.toContain(name)
  })

  it('still exports the ways to issue, rename, revoke and delete a key', () => {
    expect(Object.keys(runtime)).toEqual(
      expect.arrayContaining([
        'createApiKey',
        'updateKeyMetadata',
        'revokeKey',
        'deleteKeyMetadata',
      ])
    )
  })

  it('lists every stored field but name', () => {
    expect(listsEveryField).toBe(true)
  })

  it.each(NON_UPDATABLE_FIELDS)(
    'refuses an update to %s through the exported updateKeyMetadata',
    (field) => {
      const update = { [field]: null } as unknown as runtime.KeyMetadataUpdate

      expect(() => runtime.updateKeyMetadata('key_any', update)).toThrow(TypeError)
    }
  )
})
