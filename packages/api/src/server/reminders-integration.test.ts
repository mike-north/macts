/**
 * Integration tests for Reminders.app via the macts API server.
 *
 * Requires macOS with Reminders.app running and automation permissions.
 * Gated behind MACTS_INTEGRATION=1 environment variable.
 *
 * Tests run sequentially within the suite because later tests depend
 * on resources created by earlier tests (e.g., reminders need a list).
 *
 * Safety: Only creates objects with the __macts_e2e_ prefix.
 * All test data is cleaned up in afterAll via a LIFO cleanup stack.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadManifest } from '@macts/core'
import {
  INTEGRATION,
  generateTestId,
  testName,
  startTestServer,
  rpcRequest,
  rpcResult,
  createCleanupStack,
  type TestServerContext,
} from './integration-helpers.js'

const TEST_ID = generateTestId()
const cleanup = createCleanupStack()

let ctx: TestServerContext

describe.runIf(INTEGRATION)('Reminders.app integration', () => {
  let testListId: string
  let testReminderId: string

  beforeAll(async () => {
    vi.resetModules()

    const manifest = await loadManifest(
      new URL('../../../../manifests/reminders/app.yaml', import.meta.url).pathname
    )

    ctx = await startTestServer(manifest, [
      'reminders:lists:list',
      'reminders:lists:get',
      'reminders:lists:create',
      'reminders:lists:delete',
      'reminders:reminders:list',
      'reminders:reminders:get',
      'reminders:reminders:create',
      'reminders:reminders:delete',
      'reminders:reminders:update',
      'reminders:reminders:show',
      'reminders:accounts:list',
    ])
  }, 30_000)

  afterAll(async () => {
    // Cleanup stack is LIFO: last-pushed items (reminders) are deleted first,
    // then earlier items (lists) — maintaining parent-child ordering.
    await cleanup.executeAll()

    // Safety sweep: delete any lists matching our test prefix
    try {
      const lists = await rpcResult<{ id: string; name: string }[]>(
        ctx.app,
        ctx.apiKey,
        'reminders.lists.list'
      )
      for (const list of lists) {
        if (list.name.startsWith(`__macts_e2e_${TEST_ID}_`)) {
          try {
            await rpcResult(ctx.app, ctx.apiKey, 'reminders.lists.delete', {
              id: list.id,
            })
          } catch {
            // Best effort
          }
        }
      }
    } catch {
      // Safety sweep is non-critical
    }

    ctx.cleanup()
  })

  it('should create a test reminder list', async () => {
    const listName = testName(TEST_ID, 'list')
    const result = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'reminders.lists.create',
      { name: listName }
    )

    expect(result).toBeDefined()
    testListId = result['id'] as string
    expect(testListId).toBeDefined()
    expect(typeof testListId).toBe('string')

    // Push to LIFO cleanup stack — will be deleted after reminders
    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'reminders.lists.delete', {
        id: testListId,
      })
    })
  })

  it('should list reminder lists and include the test list', async () => {
    const lists = await rpcResult<{ name: string; id: string }[]>(
      ctx.app,
      ctx.apiKey,
      'reminders.lists.list'
    )

    expect(Array.isArray(lists)).toBe(true)
    const found = lists.find((l) => l.id === testListId)
    expect(found).toBeDefined()
    expect(found?.name).toBe(testName(TEST_ID, 'list'))
  })

  it('should create a reminder in the test list', async () => {
    const result = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'reminders.reminders.create',
      {
        listId: testListId,
        name: testName(TEST_ID, 'reminder'),
      }
    )

    expect(result).toBeDefined()
    testReminderId = result['id'] as string
    expect(testReminderId).toBeDefined()
    expect(typeof testReminderId).toBe('string')

    // Push to LIFO cleanup stack — will be deleted before the list
    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'reminders.reminders.delete', {
        id: testReminderId,
      })
    })
  })

  it('should list reminders and include the test reminder', async () => {
    const reminders = await rpcResult<{ id: string; name: string }[]>(
      ctx.app,
      ctx.apiKey,
      'reminders.reminders.list',
      { listId: testListId }
    )

    expect(Array.isArray(reminders)).toBe(true)
    const found = reminders.find((r) => r.id === testReminderId)
    expect(found).toBeDefined()
    expect(found?.name).toBe(testName(TEST_ID, 'reminder'))
  })

  it('should delete the reminder', async () => {
    await rpcResult(ctx.app, ctx.apiKey, 'reminders.reminders.delete', {
      id: testReminderId,
    })

    // Verify the reminder is gone from the list
    const reminders = await rpcResult<{ id: string }[]>(
      ctx.app,
      ctx.apiKey,
      'reminders.reminders.list',
      { listId: testListId }
    )
    const found = reminders.find((r) => r.id === testReminderId)
    expect(found).toBeUndefined()
  })

  // --- Negative tests ---

  it('should reject get with a non-existent list ID', async () => {
    await expect(
      rpcResult(ctx.app, ctx.apiKey, 'reminders.lists.get', {
        id: 'nonexistent-list-id-12345',
      })
    ).rejects.toThrow(/Command execution failed/)
  })

  it('should reject create reminder with missing required fields', async () => {
    const res = await rpcRequest(ctx.app, ctx.apiKey, 'reminders.reminders.create', {
      // Missing listId and name
    })
    expect(res.status).toBe(400)
  })

  it('should handle unicode list names', async () => {
    const listName = testName(TEST_ID, '提醒事项')
    const result = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'reminders.lists.create',
      { name: listName }
    )

    const createdId = result['id'] as string
    expect(createdId).toBeDefined()

    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'reminders.lists.delete', {
        id: createdId,
      })
    })

    // Verify it appears in the list
    const lists = await rpcResult<{ name: string; id: string }[]>(
      ctx.app,
      ctx.apiKey,
      'reminders.lists.list'
    )
    const found = lists.find((l) => l.id === createdId)
    expect(found).toBeDefined()
    expect(found?.name).toBe(listName)

    // Verify it can be retrieved by ID
    const fetched = await rpcResult<{ name: string; id: string }>(
      ctx.app,
      ctx.apiKey,
      'reminders.lists.get',
      { id: createdId }
    )
    expect(fetched.name).toBe(listName)
  })

  it('should handle long list names', async () => {
    const longSuffix = 'b'.repeat(500)
    const listName = testName(TEST_ID, longSuffix)
    const result = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'reminders.lists.create',
      { name: listName }
    )

    const createdId = result['id'] as string
    expect(createdId).toBeDefined()

    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'reminders.lists.delete', {
        id: createdId,
      })
    })
  })

  it('should handle concurrent reminder creates', async () => {
    // Create a fresh list for concurrency test
    const listName = testName(TEST_ID, 'concurrent')
    const listResult = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'reminders.lists.create',
      { name: listName }
    )
    const concurrentListId = listResult['id'] as string

    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'reminders.lists.delete', {
        id: concurrentListId,
      })
    })

    // Create 3 reminders simultaneously
    const creates = await Promise.all(
      [1, 2, 3].map((i) =>
        rpcResult<Record<string, unknown>>(ctx.app, ctx.apiKey, 'reminders.reminders.create', {
          listId: concurrentListId,
          name: testName(TEST_ID, `concurrent-${String(i)}`),
        })
      )
    )

    // All should succeed and have unique IDs
    const ids = creates.map((r) => r['id'] as string)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)

    // Push cleanup for all reminders
    for (const id of ids) {
      cleanup.push(async () => {
        await rpcResult(ctx.app, ctx.apiKey, 'reminders.reminders.delete', { id })
      })
    }

    // Verify all appear in list
    const reminders = await rpcResult<{ id: string }[]>(
      ctx.app,
      ctx.apiKey,
      'reminders.reminders.list',
      { listId: concurrentListId }
    )
    for (const id of ids) {
      expect(reminders.find((r) => r.id === id)).toBeDefined()
    }
  })
})
