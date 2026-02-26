/**
 * Read-only integration tests for apps where we don't create data.
 *
 * Verifies the full HTTP → JXA chain works without creating any objects.
 * Each app just lists resources and verifies arrays are returned.
 *
 * Requires macOS with the relevant apps available and automation permissions.
 * Gated behind MACTS_INTEGRATION=1 environment variable.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadManifest } from '@macts/core'
import {
  INTEGRATION,
  startTestServer,
  rpcResult,
  type TestServerContext,
} from './integration-helpers.js'

describe.runIf(INTEGRATION)('Read-only integration tests', () => {
  describe('Contacts.app', () => {
    let ctx: TestServerContext

    beforeAll(async () => {
      vi.resetModules()
      const manifest = await loadManifest(
        new URL('../../../../manifests/contacts/app.yaml', import.meta.url).pathname
      )
      ctx = await startTestServer(manifest, ['contacts:*:*'])
    }, 30_000)

    afterAll(() => {
      ctx.cleanup()
    })

    it('should list contacts (returns array)', async () => {
      const result = await rpcResult<unknown[]>(ctx.app, ctx.apiKey, 'contacts.people.list')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should list groups (returns array)', async () => {
      const result = await rpcResult<unknown[]>(ctx.app, ctx.apiKey, 'contacts.groups.list')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should reject get with a non-existent contact ID', async () => {
      await expect(
        rpcResult(ctx.app, ctx.apiKey, 'contacts.people.get', {
          id: 'nonexistent-contact-id-99999',
        })
      ).rejects.toThrow(/Command execution failed/)
    })

    it('should reject malformed JSON in request body', async () => {
      const res = await ctx.app.request('/api/v1/rpc/contacts.people.list', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ctx.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: 'this is not json',
      })
      expect(res.status).toBe(400)
    })
  })

  describe('Shortcuts.app', () => {
    let ctx: TestServerContext

    beforeAll(async () => {
      vi.resetModules()
      const manifest = await loadManifest(
        new URL('../../../../manifests/shortcuts/app.yaml', import.meta.url).pathname
      )
      ctx = await startTestServer(manifest, ['shortcuts:*:*'])
    }, 30_000)

    afterAll(() => {
      ctx.cleanup()
    })

    it('should list shortcuts (returns array)', async () => {
      const result = await rpcResult<unknown[]>(ctx.app, ctx.apiKey, 'shortcuts.shortcuts.list')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should list folders (returns array)', async () => {
      const result = await rpcResult<unknown[]>(ctx.app, ctx.apiKey, 'shortcuts.folders.list')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Notes.app', () => {
    let ctx: TestServerContext

    beforeAll(async () => {
      vi.resetModules()
      const manifest = await loadManifest(
        new URL('../../../../manifests/notes/app.yaml', import.meta.url).pathname
      )
      ctx = await startTestServer(manifest, ['notes:*:*'])
    }, 30_000)

    afterAll(() => {
      ctx.cleanup()
    })

    it('should list notes (returns array)', async () => {
      const result = await rpcResult<unknown[]>(ctx.app, ctx.apiKey, 'notes.notes.list')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should list folders (returns array)', async () => {
      const result = await rpcResult<unknown[]>(ctx.app, ctx.apiKey, 'notes.folders.list')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Music.app', () => {
    let ctx: TestServerContext

    beforeAll(async () => {
      vi.resetModules()
      const manifest = await loadManifest(
        new URL('../../../../manifests/music/app.yaml', import.meta.url).pathname
      )
      ctx = await startTestServer(manifest, ['music:*:*'])
    }, 30_000)

    afterAll(() => {
      ctx.cleanup()
    })

    it('should list playlists (returns array)', async () => {
      const result = await rpcResult<unknown[]>(ctx.app, ctx.apiKey, 'music.playlists.list')
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
