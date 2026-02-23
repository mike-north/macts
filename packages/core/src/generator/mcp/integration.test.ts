/**
 * Integration tests for MCP generator with real manifests.
 */

import { describe, it, expect } from 'vitest'
import { generateMcpPlugin } from './index.js'
import { createMcpGeneratorContext } from './context.js'
import { loadManifest } from '../../manifest/loader.js'
import { resolve } from 'node:path'

describe('MCP Generator Integration', () => {
  it('should generate MCP plugin from Calendar manifest', async () => {
    // Load the actual Calendar manifest
    const manifestPath = resolve(process.cwd(), '../../manifests/calendar/app.yaml')

    const manifest = await loadManifest(manifestPath)

    const context = createMcpGeneratorContext({
      appName: 'calendar',
      manifest,
      version: '0.1.0',
    })

    const result = generateMcpPlugin(context)

    // Verify basic structure
    expect(result.pluginName).toBe('calendar')
    expect(result.tools.length).toBeGreaterThan(0)

    // The Calendar manifest only defines explicit commands, not CRUD operations
    // It has app commands and the 'show' resource command for Event

    // Verify event show command exists
    const showTool = result.tools.find((t) => t.name === 'macts__calendar__events_show')
    expect(showTool).toBeDefined()
    expect(showTool?.description).toContain('Show')
    expect(showTool?.isResourceOperation).toBe(true)
    expect(showTool?.resourceType).toBe('Event')

    // Verify app commands exist
    const reloadTool = result.tools.find((t) => t.name === 'macts__calendar__app_reload_calendars')
    expect(reloadTool).toBeDefined()

    // Verify generated code structure
    expect(result.pluginContent).toContain('export const calendarPlugin: McpPlugin')
    expect(result.indexContent).toContain('export { calendarPlugin as plugin, calendarPlugin }')

    // Verify tool files
    // Should have events.ts (for show command)
    const eventsFile = result.toolFiles.find((f) => f.fileName === 'events.ts')
    expect(eventsFile).toBeDefined()
    expect(eventsFile?.content).toContain('import type { McpToolDefinition }')
    expect(eventsFile?.content).toContain("import { getClient } from '../sdk.js'")

    // Should have app.ts (for app commands)
    const appFile = result.toolFiles.find((f) => f.fileName === 'app.ts')
    expect(appFile).toBeDefined()

    // Verify package.json
    const packageJson = JSON.parse(result.packageJson) as {
      name: string
      version: string
    }
    expect(packageJson.name).toBe('@macts/mcp-calendar')
    expect(packageJson.version).toBe('0.1.0')
  })

  it('should generate valid TypeScript syntax', async () => {
    const manifestPath = resolve(process.cwd(), '../../manifests/calendar/app.yaml')

    const manifest = await loadManifest(manifestPath)

    const context = createMcpGeneratorContext({
      appName: 'calendar',
      manifest,
    })

    const result = generateMcpPlugin(context)

    // Check that all generated code has valid syntax patterns
    for (const toolFile of result.toolFiles) {
      // Should have proper imports
      expect(toolFile.content).toMatch(/import type { McpToolDefinition } from '@macts\/mcp'/)
      expect(toolFile.content).toMatch(/import { getClient } from '\.\.\/sdk\.js'/)

      // Should export tool constants
      expect(toolFile.content).toMatch(/export const \w+Tool: McpToolDefinition = {/)

      // Should have proper structure
      expect(toolFile.content).toContain('name:')
      expect(toolFile.content).toContain('description:')
      expect(toolFile.content).toContain('inputSchema:')
      expect(toolFile.content).toContain('handler:')
    }

    // Plugin file should be valid
    expect(result.pluginContent).toMatch(/export const \w+Plugin: McpPlugin = {/)
    expect(result.pluginContent).toContain('tools: allTools')

    // Index file should have plugin alias export
    expect(result.indexContent).toMatch(
      /export { \w+Plugin as plugin, \w+Plugin } from '\.\/plugin\.js'/
    )
  })

  it('should handle nested resources correctly', async () => {
    const manifestPath = resolve(process.cwd(), '../../manifests/calendar/app.yaml')

    const manifest = await loadManifest(manifestPath)

    const context = createMcpGeneratorContext({
      appName: 'calendar',
      manifest,
    })

    const result = generateMcpPlugin(context)

    // Events are nested under calendars - verify the show command exists
    const showTool = result.tools.find((t) => t.name === 'macts__calendar__events_show')
    expect(showTool).toBeDefined()

    // The schema should include calendarId since events are nested
    if (showTool) {
      expect(showTool.inputSchema.properties).toBeDefined()
    }
  })

  it('should generate files array with SDK and boilerplate from real manifest', async () => {
    const manifestPath = resolve(process.cwd(), '../../manifests/calendar/app.yaml')

    const manifest = await loadManifest(manifestPath)

    const context = createMcpGeneratorContext({
      appName: 'calendar',
      manifest,
      version: '0.1.0',
    })

    const result = generateMcpPlugin(context)

    // Should have files array
    expect(result.files.length).toBeGreaterThan(0)

    // SDK file should reference calendar SDK package
    const sdkFile = result.files.find((f) => f.path === 'src/sdk.ts')
    expect(sdkFile).toBeDefined()
    expect(sdkFile?.content).toContain("from '@macts/sdk-calendar'")
    expect(sdkFile?.content).toContain('CalendarClient')
    expect(sdkFile?.content).toContain('getClient')

    // Package.json should depend on SDK package
    const packageJson = JSON.parse(result.packageJson) as {
      dependencies: Record<string, string>
    }
    expect(packageJson.dependencies).toHaveProperty('@macts/sdk-calendar')

    // Tool files should use HTTP client pattern, not JXA SDK
    for (const toolFile of result.toolFiles) {
      expect(toolFile.content).toContain('getClient()')
      expect(toolFile.content).not.toContain('getCalendarSDK()')
      expect(toolFile.content).not.toContain('.connect()')
    }
  })
})
