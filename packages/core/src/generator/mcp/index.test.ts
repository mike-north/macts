/**
 * Tests for MCP plugin generator.
 */

import { describe, it, expect } from 'vitest'
import { generateMcpPlugin } from './index.js'
import { createMcpGeneratorContext } from './context.js'
import type { AppManifest } from '../../manifest/index.js'

describe('generateMcpPlugin', () => {
  const mockManifest: AppManifest = {
    version: '1.0',
    app: {
      bundleId: 'com.example.testapp',
      name: 'TestApp',
      displayName: 'Test App',
      tccEntitlements: [],
    },
    suites: [],
    resources: {
      Calendar: {
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {
          calendarIdentifier: {
            access: 'r',
            type: 'string',
            description: 'Calendar ID',
            optional: false,
          },
          name: {
            access: 'rw',
            type: 'string',
            description: 'Calendar name',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'calendarIdentifier',
            primary: true,
          },
        ],
      },
    },
    enums: {},
    hierarchy: {
      children: {
        calendars: {
          resource: 'Calendar',
          access: 'rw',
        },
      },
    },
    relationships: [],
    commands: {
      list: {
        name: 'list',
        description: 'List resources',
        scope: 'resource',
        parameters: [],
      },
      get: {
        name: 'get',
        description: 'Get a resource',
        scope: 'resource',
        parameters: [],
      },
      create: {
        name: 'create',
        description: 'Create a resource',
        scope: 'resource',
        parameters: [],
      },
      reloadCalendars: {
        name: 'reloadCalendars',
        description: 'Reload all calendars',
        scope: 'application',
        parameters: [],
      },
    },
  }

  it('should generate plugin with correct structure', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    expect(result.pluginName).toBe('testapp')
    expect(result.pluginContent).toContain('export const testappPlugin')
    expect(result.indexContent).toContain('export { testappPlugin as plugin, testappPlugin }')
    expect(result.toolsIndexContent).toContain('export const allTools')
    expect(result.packageJson).toContain('@macts/testapp-server')
    expect(result.tools.length).toBeGreaterThan(0)
    expect(result.toolFiles.length).toBeGreaterThan(0)
  })

  it('should generate tools for resource operations', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    const resourceTools = result.tools.filter((t) => t.isResourceOperation)
    expect(resourceTools.length).toBeGreaterThan(0)

    const listTool = result.tools.find((t) => t.name === 'macts__testapp__calendars_list')
    expect(listTool).toBeDefined()
    expect(listTool?.operationName).toBe('list')
    expect(listTool?.resourceType).toBe('Calendar')

    const getTool = result.tools.find((t) => t.name === 'macts__testapp__calendars_get')
    expect(getTool).toBeDefined()

    const createTool = result.tools.find((t) => t.name === 'macts__testapp__calendars_create')
    expect(createTool).toBeDefined()
  })

  it('should generate tools for app commands', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    const appTools = result.tools.filter((t) => !t.isResourceOperation)
    expect(appTools.length).toBeGreaterThan(0)

    const reloadTool = result.tools.find((t) => t.name === 'macts__testapp__app_reload_calendars')
    expect(reloadTool).toBeDefined()
    expect(reloadTool?.operationName).toBe('reloadCalendars')
  })

  it('should generate tool files grouped by resource', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    const calendarsFile = result.toolFiles.find((f) => f.fileName === 'calendars.ts')
    expect(calendarsFile).toBeDefined()
    expect(calendarsFile?.tools.length).toBeGreaterThan(0)

    const appFile = result.toolFiles.find((f) => f.fileName === 'app.ts')
    expect(appFile).toBeDefined()
  })

  it('should generate valid TypeScript code', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    // Plugin file should have proper imports and exports
    expect(result.pluginContent).toContain("import type { McpPlugin } from '@macts/mcp'")
    expect(result.pluginContent).toContain("import { allTools } from './tools/index.js'")
    expect(result.pluginContent).toContain('export const testappPlugin: McpPlugin')

    // Tool files should use HTTP client pattern
    for (const toolFile of result.toolFiles) {
      expect(toolFile.content).toContain("import type { McpToolDefinition } from '@macts/mcp'")
      expect(toolFile.content).toContain("import { getClient } from '../sdk.js'")
      expect(toolFile.content).toContain('export const')
    }

    // Tools index should aggregate all tools
    expect(result.toolsIndexContent).toContain('export const allTools = [')
    expect(result.toolsIndexContent).toContain('] as const')
  })

  it('should generate valid package.json matching mcp-reminders pattern', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
      version: '1.0.0',
    })

    const result = generateMcpPlugin(context)
    const packageJson = JSON.parse(result.packageJson) as {
      name: string
      version: string
      type: string
      keywords: string[]
      description: string
      exports: Record<string, Record<string, string>>
      main: string
      types: string
      files: string[]
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
      scripts: Record<string, string>
    }

    expect(packageJson.name).toBe('@macts/testapp-server')
    expect(packageJson.version).toBe('1.0.0')
    expect(packageJson.type).toBe('module')
    expect(packageJson.keywords).toEqual(['macts-mcp-plugin'])
    expect(packageJson.description).toBe('MCP plugin for macOS TestApp.app')
    expect(packageJson.exports).toEqual({
      '.': {
        types: './dist/testapp-server.d.ts',
        import: './dist/index.js',
      },
    })
    expect(packageJson.main).toBe('./dist/index.js')
    expect(packageJson.types).toBe('./dist/testapp-server.d.ts')
    expect(packageJson.files).toEqual(['dist'])
    expect(packageJson.dependencies).toHaveProperty('@macts/mcp')
    expect(packageJson.dependencies).toHaveProperty('@macts/sdk-testapp')
    expect(packageJson.scripts).toEqual({
      build: 'tsup',
      'api-extractor': 'api-extractor run --local',
      'api-extractor:ci': 'api-extractor run',
      lint: 'eslint src',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    })
    expect(packageJson.devDependencies).toEqual({
      tsup: 'catalog:',
      vitest: 'catalog:',
      typescript: 'catalog:',
    })
  })

  it('should handle custom package name', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
      packageName: '@custom/mcp-plugin',
    })

    const result = generateMcpPlugin(context)
    const packageJson = JSON.parse(result.packageJson) as {
      name: string
    }

    expect(packageJson.name).toBe('@custom/mcp-plugin')
  })

  it('should handle app with no commands', () => {
    const minimalManifest: AppManifest = {
      ...mockManifest,
      commands: {},
    }

    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: minimalManifest,
    })

    const result = generateMcpPlugin(context)

    expect(result.tools.length).toBe(0)
    expect(result.toolFiles.length).toBe(0)
  })

  it('should generate different tools for different resource types', () => {
    const multiResourceManifest: AppManifest = {
      ...mockManifest,
      resources: {
        ...mockManifest.resources,
        Event: {
          name: 'Event',
          plural: 'Events',
          description: 'An event',
          properties: {
            uid: {
              access: 'r',
              type: 'string',
              description: 'Event UID',
              optional: false,
            },
          },
          identifiers: [
            {
              property: 'uid',
              primary: true,
            },
          ],
        },
      },
      hierarchy: {
        children: {
          calendars: {
            resource: 'Calendar',
            access: 'rw',
            children: {
              events: {
                resource: 'Event',
                access: 'rw',
              },
            },
          },
        },
      },
    }

    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: multiResourceManifest,
    })

    const result = generateMcpPlugin(context)

    const calendarTools = result.tools.filter((t) => t.resourceType === 'Calendar')
    const eventTools = result.tools.filter((t) => t.resourceType === 'Event')

    expect(calendarTools.length).toBeGreaterThan(0)
    expect(eventTools.length).toBeGreaterThan(0)

    const calendarsFile = result.toolFiles.find((f) => f.fileName === 'calendars.ts')
    const eventsFile = result.toolFiles.find((f) => f.fileName === 'events.ts')

    expect(calendarsFile).toBeDefined()
    expect(eventsFile).toBeDefined()
  })

  it('should generate index.ts with plugin alias export', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    expect(result.indexContent).toContain('export { testappPlugin as plugin, testappPlugin }')
    expect(result.indexContent).toContain(
      "export type { McpPlugin, McpToolDefinition } from '@macts/mcp'"
    )
  })

  it('should generate files array with all expected files', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    const filePaths = result.files.map((f) => f.path)

    // Source files
    expect(filePaths).toContain('src/tools/calendars.ts')
    expect(filePaths).toContain('src/tools/app.ts')
    expect(filePaths).toContain('src/tools/index.ts')
    expect(filePaths).toContain('src/plugin.ts')
    expect(filePaths).toContain('src/index.ts')
    expect(filePaths).toContain('src/sdk.ts')

    // Config files
    expect(filePaths).toContain('package.json')
    expect(filePaths).toContain('tsconfig.json')
    expect(filePaths).toContain('tsup.config.ts')
    expect(filePaths).toContain('vitest.config.ts')
    expect(filePaths).toContain('.gitignore')
    expect(filePaths).toContain('api-extractor.json')
    expect(filePaths).toContain('api-report/.gitkeep')
    expect(filePaths).toContain('temp/.gitkeep')
  })

  it('should generate sdk.ts with HTTP client singleton', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    const sdkFile = result.files.find((f) => f.path === 'src/sdk.ts')
    expect(sdkFile).toBeDefined()
    if (!sdkFile) throw new Error('SDK file not found')

    const content = sdkFile.content
    expect(content).toContain(
      "import { TestAppClient, type TestAppClientOptions } from '@macts/sdk-testapp'"
    )
    expect(content).toContain('export function getTestAppClient(): TestAppClient')
    expect(content).toContain("process.env['MACTS_API_KEY']")
    expect(content).toContain('export function getClient(): TestAppClient')
    expect(content).toContain('export function resetClient(): void')
    expect(content).toContain('_client ??= getTestAppClient()')
  })

  it('should generate boilerplate config files with correct content', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    // tsconfig.json
    const tsconfig = result.files.find((f) => f.path === 'tsconfig.json')
    expect(tsconfig).toBeDefined()
    if (!tsconfig) throw new Error('tsconfig.json not found')
    const tsconfigParsed = JSON.parse(tsconfig.content) as { extends: string }
    expect(tsconfigParsed.extends).toBe('../../tsconfig.base.json')

    // tsup.config.ts
    const tsup = result.files.find((f) => f.path === 'tsup.config.ts')
    expect(tsup).toBeDefined()
    if (!tsup) throw new Error('tsup.config.ts not found')
    expect(tsup.content).toContain("entry: ['src/index.ts']")
    expect(tsup.content).toContain("format: ['esm']")

    // vitest.config.ts
    const vitest = result.files.find((f) => f.path === 'vitest.config.ts')
    expect(vitest).toBeDefined()
    if (!vitest) throw new Error('vitest.config.ts not found')
    expect(vitest.content).toContain("environment: 'node'")

    // .gitignore
    const gitignore = result.files.find((f) => f.path === '.gitignore')
    expect(gitignore).toBeDefined()
    if (!gitignore) throw new Error('.gitignore not found')
    expect(gitignore.content).toContain('dist/')
    expect(gitignore.content).toContain('node_modules/')

    // api-extractor.json
    const apiExtractor = result.files.find((f) => f.path === 'api-extractor.json')
    expect(apiExtractor).toBeDefined()
    if (!apiExtractor) throw new Error('api-extractor.json not found')
    const apiExtractorParsed = JSON.parse(apiExtractor.content) as {
      $schema: string
      extends: string
    }
    expect(apiExtractorParsed.$schema).toBe(
      'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json'
    )
    expect(apiExtractorParsed.extends).toBe('../../api-extractor.base.json')

    // .gitkeep files
    const apiReportGitkeep = result.files.find((f) => f.path === 'api-report/.gitkeep')
    expect(apiReportGitkeep).toBeDefined()
    if (!apiReportGitkeep) throw new Error('api-report/.gitkeep not found')
    expect(apiReportGitkeep.content).toBe('')

    const tempGitkeep = result.files.find((f) => f.path === 'temp/.gitkeep')
    expect(tempGitkeep).toBeDefined()
    if (!tempGitkeep) throw new Error('temp/.gitkeep not found')
    expect(tempGitkeep.content).toBe('')
  })

  it('should use default version 0.0.0 when no version specified', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)
    const packageJson = JSON.parse(result.packageJson) as { version: string }

    expect(packageJson.version).toBe('0.0.0')
  })

  it('should use custom sdkPackageName in generated files', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
      sdkPackageName: '@custom/sdk-testapp',
    })

    const result = generateMcpPlugin(context)

    // SDK file should import from custom package
    const sdkFile = result.files.find((f) => f.path === 'src/sdk.ts')
    expect(sdkFile).toBeDefined()
    if (!sdkFile) throw new Error('SDK file not found')
    expect(sdkFile.content).toContain("from '@custom/sdk-testapp'")

    // Package.json should depend on custom package
    const packageJson = JSON.parse(result.packageJson) as {
      dependencies: Record<string, string>
    }
    expect(packageJson.dependencies).toHaveProperty('@custom/sdk-testapp')
  })

  it('should generate HTTP client pattern in handler code', () => {
    const context = createMcpGeneratorContext({
      appName: 'testapp',
      manifest: mockManifest,
    })

    const result = generateMcpPlugin(context)

    // All tool files should use getClient(), not getTestappSDK()
    for (const toolFile of result.toolFiles) {
      expect(toolFile.content).toContain('getClient()')
      expect(toolFile.content).not.toContain('getTestappSDK()')
      expect(toolFile.content).not.toContain('.connect()')
    }
  })
})

/**
 * Regression tests for the strict-typecheck failures in generated MCP handler code.
 *
 * MCP handlers receive `args: unknown` (validated against JSON Schema) and call SDK
 * methods with precise parameter types. Earlier output cast arguments with bare
 * `as unknown` (assignable to no concrete type) and `as Record<string, unknown>`, and
 * the generic resource-command handler passed only an ID even when the SDK method took
 * additional parameters. These caused TS2345/TS2554 failures.
 */
describe('generateMcpPlugin handler casts (regression)', () => {
  const manifest: AppManifest = {
    version: '1.0',
    app: {
      bundleId: 'com.example.browser',
      name: 'Browser',
      displayName: 'Browser',
      tccEntitlements: [],
    },
    suites: [],
    resources: {
      Tab: {
        name: 'Tab',
        plural: 'Tabs',
        description: 'A tab',
        properties: {
          id: { access: 'r', type: 'string', description: 'Tab ID', optional: false },
        },
        identifiers: [{ property: 'id', primary: true }],
      },
    },
    enums: {},
    hierarchy: { children: { tabs: { resource: 'Tab', access: 'r' } } },
    relationships: [],
    commands: {
      // Resource command taking the resource ID plus an extra parameter — the handler
      // must pass BOTH positionally, not just the ID.
      execute: {
        name: 'execute',
        description: 'Execute javascript in a tab',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          { name: 'tabId', type: 'string', description: 'Tab ID', required: true },
          { name: 'javascript', type: 'string', description: 'JS to run', required: true },
        ],
      },
      // App command with a parameter — argument must be asserted to the SDK param type.
      navigate: {
        name: 'navigate',
        description: 'Navigate to a URL',
        scope: 'application',
        parameters: [{ name: 'url', type: 'string', description: 'URL', required: true }],
      },
    },
  }

  function toolContent(fileName: string): string {
    const context = createMcpGeneratorContext({ appName: 'browser', manifest })
    const result = generateMcpPlugin(context)
    const file = result.toolFiles.find((f) => f.fileName === fileName)
    expect(file, `expected tool file ${fileName}`).toBeDefined()
    return file?.content ?? ''
  }

  it('never emits bare `as unknown` or `as Record<string, unknown>` argument casts', () => {
    const tabs = toolContent('tabs.ts')
    const app = toolContent('app.ts')

    for (const content of [tabs, app]) {
      // Bare `as unknown` immediately before a call-closing paren or comma is the bug.
      expect(content).not.toMatch(/ as unknown[),]/)
      expect(content).not.toContain('as Record<string, unknown>')
    }
  })

  it('passes all positional arguments to a resource command, asserting each SDK param type', () => {
    const content = toolContent('tabs.ts')

    expect(content).toContain('as unknown as Parameters<typeof client.tabs.execute>[0]')
    expect(content).toContain('as unknown as Parameters<typeof client.tabs.execute>[1]')
  })

  it('asserts app-command arguments to the SDK method parameter type', () => {
    const content = toolContent('app.ts')

    expect(content).toContain('as unknown as Parameters<typeof client.navigate>[0]')
  })
})
