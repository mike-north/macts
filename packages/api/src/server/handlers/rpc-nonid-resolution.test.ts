/**
 * Regression tests for RPC get/delete identifier resolution.
 *
 * Verifies that the RPC handler resolves the identifier parameter from the
 * manifest-declared parameter name (e.g. `name`, `folderName`) rather than
 * hard-coding `id`. Covers issue #26.
 *
 * Representative apps from the current manifests:
 *   - Notes.app: `get` uses `name` as the required identifier
 *   - Automator.app: `get` uses `name` as the required identifier
 *
 * @see packages/api/src/server/handlers/rpc.ts — executeResourceCommand
 * @see manifests/notes/app.yaml — commands.get.parameters[0].name = "name"
 * @see manifests/automator/app.yaml — commands.get.parameters[0].name = "name"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppManifest } from '@macts/core'
import { createApp } from '../index.js'

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// Mock the JXA executor so no real macOS automation runs in unit tests.
// We capture the `code` argument to assert which variable name is used.
vi.mock('@macts/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@macts/core')>()
  return {
    ...actual,
    runWithApp: vi.fn().mockResolvedValue({ name: 'result' }),
  }
})

// Mock auth so we can make authenticated requests without real keys.
vi.mock('../../keys/validator.js', () => ({
  validateApiKey: vi.fn().mockResolvedValue({
    valid: true,
    payload: {
      iss: 'macts',
      sub: 'test-key',
      iat: 0,
      permissions: ['*:*:*'],
    },
  }),
  checkPayloadPermission: vi.fn().mockReturnValue({
    granted: true,
    required: 'testapp:items:get',
    matchedBy: '*:*:*',
  }),
}))

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * A minimal manifest whose `get` command uses `name` (not `id`) as the
 * required identifier — exactly like Notes.app and several other current
 * manifests.
 */
const nonIdGetManifest: AppManifest = {
  version: '1.0',
  app: {
    name: 'TestNotesLike',
    bundleId: 'com.test.noteslike',
    version: '1.0.0',
    tccEntitlements: [],
  },
  resources: {
    Item: {
      name: 'Item',
      plural: 'items',
      description: 'A test item',
      properties: {
        name: { access: 'r', type: 'string', description: 'Name', optional: false },
        body: { access: 'rw', type: 'string', description: 'Body', optional: true },
      },
    },
  },
  hierarchy: {
    children: {
      items: { resource: 'Item', access: 'rw' },
    },
  },
  commands: {
    get: {
      name: 'get',
      description: 'Get an item by name',
      scope: 'resource',
      resourceType: 'Item',
      // Identifier param is "name", NOT "id"
      parameters: [{ name: 'name', type: 'string', description: 'Item name', required: true }],
      permission: 'testnoteslike:items:get',
    },
    list: {
      name: 'list',
      description: 'List items',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [],
      permission: 'testnoteslike:items:list',
    },
  },
  enums: {},
  suites: [],
  relationships: [],
}

/**
 * A manifest whose `delete` command uses `name` (not `id`) as the identifier.
 */
const nonIdDeleteManifest: AppManifest = {
  version: '1.0',
  app: {
    name: 'TestDelApp',
    bundleId: 'com.test.delapp',
    version: '1.0.0',
    tccEntitlements: [],
  },
  resources: {
    Widget: {
      name: 'Widget',
      plural: 'widgets',
      description: 'A test widget',
      properties: {
        name: { access: 'r', type: 'string', description: 'Name', optional: false },
      },
    },
  },
  hierarchy: {
    children: {
      widgets: { resource: 'Widget', access: 'rw' },
    },
  },
  commands: {
    deleteWidget: {
      name: 'delete',
      description: 'Delete a widget by name',
      scope: 'resource',
      resourceType: 'Widget',
      // Identifier param is "name", NOT "id"
      parameters: [
        { name: 'widgetName', type: 'string', description: 'Widget name', required: true },
      ],
      permission: 'testdelapp:widgets:deleteWidget',
    },
    list: {
      name: 'list',
      description: 'List widgets',
      scope: 'resource',
      resourceType: 'Widget',
      parameters: [],
      permission: 'testdelapp:widgets:list',
    },
  },
  enums: {},
  suites: [],
  relationships: [],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Send an authenticated POST to an RPC endpoint and return response + mocked JXA code. */
async function callRpc(
  manifest: AppManifest,
  route: string,
  body: Record<string, unknown>
): Promise<{ status: number; responseBody: unknown; capturedJxaCode: string }> {
  const { runWithApp } = await import('@macts/core')
  vi.mocked(runWithApp).mockClear()

  const app = createApp([manifest], { cors: false, logging: false })
  const res = await app.request(`/api/v1/rpc/${route}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer macts_sk_test',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const rawCode =
    vi.mocked(runWithApp).mock.calls.length > 0
      ? vi.mocked(runWithApp).mock.calls[0]?.[1]
      : undefined
  const capturedJxaCode = typeof rawCode === 'string' ? rawCode : ''

  return { status: res.status, responseBody: await res.json(), capturedJxaCode }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RPC get/delete identifier resolution (issue #26 regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Criterion A: get resolves a non-`id` identifier
  describe('get command resolves the manifest-declared identifier param (not hardcoded "id")', () => {
    it('uses "name" variable in JXA code when manifest declares name as the identifier', async () => {
      // Derived from manifests/notes/app.yaml: commands.get.parameters[0].name = "name"
      const { status, capturedJxaCode } = await callRpc(
        nonIdGetManifest,
        'testnoteslike.items.get',
        { name: 'My Note' }
      )

      // The RPC handler must reach runWithApp (not short-circuit with an error)
      expect(status).toBe(200)

      // The generated JXA must declare the manifest identifier variable `name`
      // and look up the item using that variable — never a literal `id`.
      //
      // Spec-first: the manifest declares parameter name="name", so the JXA
      // must contain `var name = "My Note"` and reference it via byId(name).
      expect(capturedJxaCode).toContain('var name =')
      expect(capturedJxaCode).toContain('"My Note"')

      // Must NOT contain a bare `id` variable assignment or byId(id) — that
      // would be the bug this test guards against.
      expect(capturedJxaCode).not.toContain('var id =')
      expect(capturedJxaCode).not.toContain('byId(id)')
    })

    it('uses the manifest identifier name in the byId() call for get', async () => {
      // The byId() call must use the manifest-declared identifier, not "id".
      const { capturedJxaCode } = await callRpc(nonIdGetManifest, 'testnoteslike.items.get', {
        name: 'Another Note',
      })

      // Spec: the get branch must call byId with the manifest identifier variable
      expect(capturedJxaCode).toContain('byId(name)')
    })

    it('returns an error when the required identifier param is missing', async () => {
      // Negative: missing required param "name" → should be caught by Zod validation
      const { status, responseBody } = await callRpc(
        nonIdGetManifest,
        'testnoteslike.items.get',
        {} // no "name" field
      )

      const body = responseBody as { error: { code: string } }
      expect(status).toBe(400)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // Criterion B: delete resolves a non-`id` identifier
  describe('delete command resolves the manifest-declared identifier param (not hardcoded "id")', () => {
    it('uses "widgetName" variable in JXA code when manifest declares widgetName as the identifier', async () => {
      const { status, capturedJxaCode } = await callRpc(
        nonIdDeleteManifest,
        'testdelapp.widgets.deleteWidget',
        { widgetName: 'MyWidget' }
      )

      expect(status).toBe(200)

      // Spec-first: the manifest declares parameter name="widgetName", so the
      // JXA must declare `var widgetName = "MyWidget"`.
      expect(capturedJxaCode).toContain('var widgetName =')
      expect(capturedJxaCode).toContain('"MyWidget"')

      // Must NOT fall back to "id"
      expect(capturedJxaCode).not.toContain('var id =')
      expect(capturedJxaCode).not.toContain('byId(id)')
    })

    it('uses the manifest identifier name in the byId() call for delete', async () => {
      // The delete path must look up the resource by the manifest identifier.
      const { capturedJxaCode } = await callRpc(
        nonIdDeleteManifest,
        'testdelapp.widgets.deleteWidget',
        { widgetName: 'AnotherWidget' }
      )

      // Spec: delete must call byId(widgetName).delete(), not a generic app.delete(...)
      expect(capturedJxaCode).toContain('byId(widgetName)')
      expect(capturedJxaCode).toContain('.delete()')
    })

    it('returns an error when the required identifier param is missing', async () => {
      // Negative: missing required param "widgetName"
      const { status, responseBody } = await callRpc(
        nonIdDeleteManifest,
        'testdelapp.widgets.deleteWidget',
        {} // no "widgetName" field
      )

      const body = responseBody as { error: { code: string } }
      expect(status).toBe(400)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // Criterion C: representative coverage — id-based commands still work (non-regression)
  describe('commands that use "id" as the identifier continue to work', () => {
    /**
     * A manifest with the classic "id" identifier — verifies the fix doesn't
     * break existing resources that do declare `id`.
     */
    const idBasedManifest: AppManifest = {
      version: '1.0',
      app: {
        name: 'TestIdApp',
        bundleId: 'com.test.idapp',
        version: '1.0.0',
        tccEntitlements: [],
      },
      resources: {
        Entry: {
          name: 'Entry',
          plural: 'entries',
          description: 'A test entry',
          properties: {
            id: { access: 'r', type: 'string', description: 'ID', optional: false },
            name: { access: 'rw', type: 'string', description: 'Name', optional: false },
          },
        },
      },
      hierarchy: {
        children: {
          entries: { resource: 'Entry', access: 'rw' },
        },
      },
      commands: {
        get: {
          name: 'get',
          description: 'Get an entry by id',
          scope: 'resource',
          resourceType: 'Entry',
          parameters: [{ name: 'id', type: 'string', description: 'Entry ID', required: true }],
          permission: 'testidapp:entries:get',
        },
        deleteEntry: {
          name: 'delete',
          description: 'Delete an entry by id',
          scope: 'resource',
          resourceType: 'Entry',
          parameters: [{ name: 'id', type: 'string', description: 'Entry ID', required: true }],
          permission: 'testidapp:entries:deleteEntry',
        },
        list: {
          name: 'list',
          description: 'List entries',
          scope: 'resource',
          resourceType: 'Entry',
          parameters: [],
          permission: 'testidapp:entries:list',
        },
      },
      enums: {},
      suites: [],
      relationships: [],
    }

    it('get with id-named param still uses byId(id)', async () => {
      const { status, capturedJxaCode } = await callRpc(idBasedManifest, 'testidapp.entries.get', {
        id: 'entry-123',
      })

      expect(status).toBe(200)
      expect(capturedJxaCode).toContain('var id =')
      expect(capturedJxaCode).toContain('byId(id)')
    })

    it('delete with id-named param still uses byId(id).delete()', async () => {
      const { status, capturedJxaCode } = await callRpc(
        idBasedManifest,
        'testidapp.entries.deleteEntry',
        { id: 'entry-456' }
      )

      expect(status).toBe(200)
      expect(capturedJxaCode).toContain('var id =')
      expect(capturedJxaCode).toContain('byId(id)')
      expect(capturedJxaCode).toContain('.delete()')
    })
  })
})
