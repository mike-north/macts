/**
 * Tests for the server package generator.
 */

import { describe, it, expect } from 'vitest'
import { generateServerPackage } from './index.js'
import type { AppManifest } from '../../manifest/index.js'

/**
 * Create a minimal Calendar-like manifest for testing.
 */
function createCalendarManifest(): AppManifest {
  return {
    version: '1.0',
    app: {
      bundleId: 'com.apple.iCal',
      name: 'Calendar',
      tccEntitlements: [],
    },
    suites: [],
    resources: {
      Calendar: {
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar container',
        properties: {
          name: {
            access: 'rw',
            type: 'string',
            description: 'Calendar name',
            optional: false,
          },
          color: {
            access: 'rw',
            type: 'string',
            description: 'Calendar color',
            optional: true,
          },
        },
        identifiers: [{ property: 'name', primary: true }],
      },
      Event: {
        name: 'Event',
        plural: 'events',
        description: 'A calendar event',
        properties: {
          summary: {
            access: 'rw',
            type: 'string',
            description: 'Event summary',
            optional: false,
          },
          startDate: {
            access: 'rw',
            type: 'date',
            description: 'Event start date',
            optional: false,
          },
        },
        identifiers: [{ property: 'summary', primary: true }],
      },
    },
    enums: {},
    hierarchy: {
      children: {
        calendars: {
          resource: 'Calendar',
          access: 'rw',
          description: 'All calendars',
          children: {
            events: {
              resource: 'Event',
              access: 'rw',
              description: 'Events in this calendar',
            },
          },
        },
      },
    },
    relationships: [],
    commands: {
      reloadCalendars: {
        name: 'reloadCalendars',
        description: 'Reload all calendars',
        scope: 'application',
        parameters: [],
      },
      show: {
        name: 'show',
        description: 'Show an event',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [
          {
            name: 'summary',
            type: 'string',
            description: 'Event summary',
            required: true,
          },
        ],
      },
    },
  }
}

/**
 * Create a minimal manifest with a hyphenated app name.
 */
function createGoogleChromeManifest(): AppManifest {
  return {
    version: '1.0',
    app: {
      bundleId: 'com.google.Chrome',
      name: 'Google Chrome',
      tccEntitlements: [],
    },
    suites: [],
    resources: {
      Tab: {
        name: 'Tab',
        plural: 'tabs',
        description: 'A browser tab',
        properties: {
          url: {
            access: 'rw',
            type: 'string',
            description: 'Tab URL',
            optional: false,
          },
        },
        identifiers: [{ property: 'url', primary: true }],
      },
    },
    enums: {},
    hierarchy: {
      children: {
        tabs: {
          resource: 'Tab',
          access: 'rw',
          description: 'All tabs',
        },
      },
    },
    relationships: [],
    commands: {},
  }
}

describe('generateServerPackage', () => {
  it('should return dir based on the unscoped package name', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
      version: '0.1.0',
    })

    expect(result.dir).toBe('calendar-server')
    expect(result.errors).toHaveLength(0)
  })

  it('should include API source files at src/ root', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const filePaths = result.files.map((f) => f.path)

    // API files should be at src/ root
    expect(filePaths).toContain('src/plugin.ts')
    expect(filePaths).toContain('src/index.ts')
  })

  it('should include MCP source files under src/mcp/', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const filePaths = result.files.map((f) => f.path)

    // MCP files should be under src/mcp/
    expect(filePaths).toContain('src/mcp/plugin.ts')
    expect(filePaths).toContain('src/mcp/index.ts')
    expect(filePaths).toContain('src/mcp/sdk.ts')
    expect(filePaths).toContain('src/mcp/tools/index.ts')

    // Should have at least one MCP tool file
    const mcpToolFiles = filePaths.filter(
      (p) => p.startsWith('src/mcp/tools/') && p !== 'src/mcp/tools/index.ts'
    )
    expect(mcpToolFiles.length).toBeGreaterThan(0)
  })

  it('should not include standalone config files from sub-generators', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const filePaths = result.files.map((f) => f.path)

    // There should be exactly one of each config file (the unified ones)
    expect(filePaths.filter((p) => p === 'package.json')).toHaveLength(1)
    expect(filePaths.filter((p) => p === 'tsconfig.json')).toHaveLength(1)
    expect(filePaths.filter((p) => p === 'tsup.config.ts')).toHaveLength(1)
    expect(filePaths.filter((p) => p === '.gitignore')).toHaveLength(1)

    // Should not have vitest.config.ts (from MCP generator)
    expect(filePaths).not.toContain('vitest.config.ts')

    // Should not have nested config files
    expect(filePaths).not.toContain('src/mcp/package.json')
  })

  it('should generate MCP sdk.ts that imports from the client package', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const sdkFile = result.files.find((f) => f.path === 'src/mcp/sdk.ts')
    expect(sdkFile).toBeDefined()

    // Should import from the client package, not the old SDK package
    expect(sdkFile?.content).toContain("from '@macts/calendar'")
    expect(sdkFile?.content).not.toContain("from '@macts/sdk-calendar'")
  })

  it('should generate MCP tool files that import from ../sdk.js', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const mcpToolFiles = result.files.filter(
      (f) => f.path.startsWith('src/mcp/tools/') && f.path !== 'src/mcp/tools/index.ts'
    )

    expect(mcpToolFiles.length).toBeGreaterThan(0)

    for (const toolFile of mcpToolFiles) {
      // Tools import from '../sdk.js' which correctly resolves to src/mcp/sdk.ts
      expect(toolFile.content).toContain("from '../sdk.js'")
    }
  })

  it('should generate package.json with correct structure', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
      version: '1.2.3',
    })

    const pkgFile = result.files.find((f) => f.path === 'package.json')
    expect(pkgFile).toBeDefined()
    if (!pkgFile) throw new Error('package.json not found')

    const pkg = JSON.parse(pkgFile.content) as {
      name: string
      version: string
      type: string
      exports: Record<string, { types: string; import: string }>
      dependencies: Record<string, string>
      peerDependencies: Record<string, string>
      peerDependenciesMeta: Record<string, { optional: boolean }>
      scripts: Record<string, string>
    }

    expect(pkg.name).toBe('@macts/calendar-server')
    expect(pkg.version).toBe('1.2.3')
    expect(pkg.type).toBe('module')

    // Subpath exports
    expect(pkg.exports['.']).toEqual({
      types: './dist/calendar-server.d.ts',
      import: './dist/index.js',
    })
    expect(pkg.exports['./mcp']).toEqual({
      types: './dist/mcp.d.ts',
      import: './dist/mcp/index.js',
    })

    // Dependencies
    expect(pkg.dependencies['@macts/api']).toBe('workspace:*')
    expect(pkg.dependencies['@macts/core']).toBe('workspace:*')
    expect(pkg.dependencies['@macts/calendar']).toBe('workspace:*')

    // Peer dependencies
    expect(pkg.peerDependencies['@macts/mcp']).toBe('workspace:*')
    expect(pkg.peerDependenciesMeta['@macts/mcp']?.optional).toBe(true)
  })

  it('should generate package.json with version defaulting to 0.0.0', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const pkgFile = result.files.find((f) => f.path === 'package.json')
    if (!pkgFile) throw new Error('package.json not found')
    const pkg = JSON.parse(pkgFile.content) as { version: string }
    expect(pkg.version).toBe('0.0.0')
  })

  it('should generate multi-entry tsup.config.ts', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const tsupFile = result.files.find((f) => f.path === 'tsup.config.ts')
    expect(tsupFile).toBeDefined()

    // Multi-entry config
    expect(tsupFile?.content).toContain("index: 'src/index.ts'")
    expect(tsupFile?.content).toContain("'mcp/index': 'src/mcp/index.ts'")
  })

  it('should not include api-extractor configs (server packages are not documented)', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const filePaths = result.files.map((f) => f.path)

    expect(filePaths).not.toContain('api-extractor.json')
    expect(filePaths).not.toContain('api-extractor.mcp.json')
  })

  it('should not include api-extractor scripts in package.json', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const pkgFile = result.files.find((f) => f.path === 'package.json')
    if (!pkgFile) throw new Error('package.json not found')
    const pkg = JSON.parse(pkgFile.content) as { scripts: Record<string, string> }

    expect(pkg.scripts['api-extractor']).toBeUndefined()
    expect(pkg.scripts['api-extractor:ci']).toBeUndefined()
  })

  it('should have API plugin.ts with manifest content', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const pluginFile = result.files.find((f) => f.path === 'src/plugin.ts')
    expect(pluginFile).toBeDefined()
    expect(pluginFile?.content).toContain('calendarApiPlugin')
    expect(pluginFile?.content).toContain("import type { AppManifest } from '@macts/core'")
  })

  it('should have MCP plugin.ts with tool references', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const mcpPluginFile = result.files.find((f) => f.path === 'src/mcp/plugin.ts')
    expect(mcpPluginFile).toBeDefined()
    expect(mcpPluginFile?.content).toContain('calendarPlugin')
    expect(mcpPluginFile?.content).toContain("from './tools/index.js'")
  })

  it('should not have any errors for a valid manifest', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    expect(result.errors).toHaveLength(0)
  })

  it('should work with apps that have hyphenated names', () => {
    const manifest = createGoogleChromeManifest()

    const result = generateServerPackage(manifest, {
      appName: 'google-chrome',
      serverPackageName: '@macts/google-chrome-server',
      clientPackageName: '@macts/google-chrome',
    })

    expect(result.dir).toBe('google-chrome-server')
    expect(result.errors).toHaveLength(0)

    // MCP sdk should import from the client package
    const sdkFile = result.files.find((f) => f.path === 'src/mcp/sdk.ts')
    expect(sdkFile?.content).toContain("from '@macts/google-chrome'")

    // Package name should be correct
    const pkgFile = result.files.find((f) => f.path === 'package.json')
    if (!pkgFile) throw new Error('package.json not found')
    const pkg = JSON.parse(pkgFile.content) as {
      name: string
      dependencies: Record<string, string>
    }
    expect(pkg.name).toBe('@macts/google-chrome-server')
    expect(pkg.dependencies['@macts/google-chrome']).toBe('workspace:*')
  })

  it('should not include api-extractor placeholder directories', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const filePaths = result.files.map((f) => f.path)
    expect(filePaths).not.toContain('api-report/.gitkeep')
    expect(filePaths).not.toContain('temp/.gitkeep')
  })

  it('should produce MCP tool files that use getClient()', () => {
    const manifest = createCalendarManifest()
    const result = generateServerPackage(manifest, {
      appName: 'calendar',
      serverPackageName: '@macts/calendar-server',
      clientPackageName: '@macts/calendar',
    })

    const mcpToolFiles = result.files.filter(
      (f) => f.path.startsWith('src/mcp/tools/') && f.path !== 'src/mcp/tools/index.ts'
    )

    for (const toolFile of mcpToolFiles) {
      expect(toolFile.content).toContain('getClient()')
    }
  })
})
