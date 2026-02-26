/**
 * MCP tool integration tests for Calendar.app.
 *
 * Calls MCP tool handlers directly with env vars set,
 * verifying the full chain: tool handler → SDK client → HTTP API → JXA.
 *
 * Requires macOS with Calendar.app and a running API server with automation permissions.
 * Gated behind MACTS_INTEGRATION=1 environment variable.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { resetClient } from './sdk.js'

const INTEGRATION = process.env['MACTS_INTEGRATION'] === '1'

describe.runIf(INTEGRATION)('MCP Calendar tool integration', () => {
  let tools: readonly {
    name: string
    description: string
    inputSchema: Record<string, unknown>
    handler: (args: unknown) => Promise<unknown>
  }[]

  beforeAll(async () => {
    // Ensure MACTS_API_KEY is set (required by the SDK)
    if (!process.env['MACTS_API_KEY']) {
      throw new Error(
        'MACTS_API_KEY must be set for MCP integration tests. ' +
          'Create a key with: macts api-key create --permissions calendar:*:*'
      )
    }

    // Reset the singleton client to pick up fresh env vars
    resetClient()

    const { allTools } = await import('./tools/index.js')
    tools = allTools
  })

  afterAll(() => {
    resetClient()
  })

  it('should have tools registered', () => {
    expect(tools.length).toBeGreaterThan(0)
  })

  it('should list calendars via MCP tool', async () => {
    const tool = tools.find((t) => t.name === 'macts__calendar__calendars_list')
    expect(tool).toBeDefined()
    if (!tool) return

    const result = await tool.handler({})
    expect(Array.isArray(result)).toBe(true)
  })

  it('should reload calendars via MCP tool', async () => {
    const tool = tools.find((t) => t.name === 'macts__calendar__app_reload_calendars')
    expect(tool).toBeDefined()
    if (!tool) return

    const result = (await tool.handler({})) as { success: boolean }
    expect(result).toHaveProperty('success', true)
  })

  it('should switch view via MCP tool', async () => {
    const tool = tools.find((t) => t.name === 'macts__calendar__app_switch_view')
    expect(tool).toBeDefined()
    if (!tool) return

    const result = (await tool.handler({ to: 'weekView' })) as { success: boolean }
    expect(result).toHaveProperty('success', true)
  })

  it('tool names should follow naming convention', () => {
    for (const tool of tools) {
      expect(tool.name).toMatch(/^macts__calendar__/)
    }
  })

  it('should have delete tools available', () => {
    const calendarDelete = tools.find((t) => t.name === 'macts__calendar__calendars_delete')
    const eventDelete = tools.find((t) => t.name === 'macts__calendar__events_delete')

    expect(calendarDelete).toBeDefined()
    expect(eventDelete).toBeDefined()
  })
})
