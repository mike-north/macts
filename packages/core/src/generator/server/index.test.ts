/**
 * Tests for the server package generator.
 *
 * A server package is contract-only: its entry re-exports the app's generated
 * contract as `contract`, and it depends only on the app package. Expected
 * values follow the generator's module documentation and the contract's naming
 * rule (`<camelApp>Contract`, phases/13 D2).
 *
 * @see ./index.ts
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md §D2
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

/** Generate Calendar's server package with the given options. */
function calendarServer(version?: string) {
  return generateServerPackage(createCalendarManifest(), {
    appName: 'calendar',
    serverPackageName: '@macts/calendar-server',
    clientPackageName: '@macts/calendar',
    version,
  })
}

/** The content of one generated file. */
function fileContent(files: readonly { path: string; content: string }[], path: string): string {
  const file = files.find((f) => f.path === path)
  if (file === undefined) throw new Error(`${path} was not generated`)
  return file.content
}

interface ServerPackageJson {
  name: string
  version: string
  license: string
  repository: { type: string; url: string; directory: string }
  publishConfig: { access: string }
  type: string
  engines: Record<string, string>
  exports: Record<string, unknown>
  main: string
  types: string
  dependencies: Record<string, string>
  peerDependencies?: Record<string, string>
  scripts: Record<string, string>
}

function packageJson(files: readonly { path: string; content: string }[]): ServerPackageJson {
  return JSON.parse(fileContent(files, 'package.json')) as ServerPackageJson
}

describe('generateServerPackage', () => {
  it('returns the dir of the unscoped package name, and no errors', () => {
    const result = calendarServer('0.1.0')
    expect(result.dir).toBe('calendar-server')
    expect(result.errors).toEqual([])
  })

  it('emits exactly the entry and the package configuration', () => {
    expect(
      calendarServer()
        .files.map((f) => f.path)
        .sort()
    ).toEqual([
      '.gitattributes',
      '.gitignore',
      'LICENSE',
      'package.json',
      'src/index.ts',
      'tsconfig.json',
      'tsup.config.ts',
    ])
  })

  it('emits no MCP or API plugin code', () => {
    const paths = calendarServer().files.map((f) => f.path)
    expect(paths.filter((path) => path.startsWith('src/mcp/'))).toEqual([])
    expect(paths).not.toContain('src/plugin.ts')
  })

  it('re-exports the app contract as contract from the app package', () => {
    const index = fileContent(calendarServer().files, 'src/index.ts')
    expect(index).toContain(
      "export { calendarContract as contract } from '@macts/calendar/contract'"
    )
    // The entry exports nothing else.
    expect(index.match(/^export /gm)).toHaveLength(1)
  })

  it('names the contract of a multi-word app in lower camel case', () => {
    const result = generateServerPackage(createGoogleChromeManifest(), {
      appName: 'google-chrome',
      serverPackageName: '@macts/google-chrome-server',
      clientPackageName: '@macts/google-chrome',
    })
    expect(result.dir).toBe('google-chrome-server')
    expect(fileContent(result.files, 'src/index.ts')).toContain(
      "export { googleChromeContract as contract } from '@macts/google-chrome/contract'"
    )
    const pkg = packageJson(result.files)
    expect(pkg.name).toBe('@macts/google-chrome-server')
    expect(pkg.dependencies).toEqual({ '@macts/google-chrome': 'workspace:*' })
  })

  it('generates package.json with the publishing metadata', () => {
    const pkg = packageJson(calendarServer('1.2.3').files)
    expect(pkg.name).toBe('@macts/calendar-server')
    expect(pkg.version).toBe('1.2.3')
    expect(pkg.type).toBe('module')
    // Node 22.13.0 is the first 22.x that loads node:sqlite unflagged (phases/13, D1).
    expect(pkg.engines).toEqual({ node: '>=22.13.0' })
    expect(pkg.license).toBe('MIT')
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/mike-north/macts.git',
      directory: 'packages/calendar-server',
    })
    expect(pkg.publishConfig).toEqual({ access: 'public' })
  })

  it('exports only ".", in its object form, pointing at the built entry', () => {
    const pkg = packageJson(calendarServer().files)
    expect(pkg.exports).toEqual({
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
    })
    expect(pkg.main).toBe('./dist/index.js')
    // Regression: the types entry once named `./dist/<package>.d.ts`, which the
    // build never emits; it must name the declarations tsup writes for the entry.
    expect(pkg.types).toBe('./dist/index.d.ts')
  })

  it('depends only on the app package', () => {
    const pkg = packageJson(calendarServer().files)
    expect(pkg.dependencies).toEqual({ '@macts/calendar': 'workspace:*' })
    // Neither the MCP plugin types nor the server packages are needed any more.
    expect(pkg.dependencies['@macts/types']).toBeUndefined()
    expect(pkg.dependencies['@macts/api']).toBeUndefined()
    expect(pkg.dependencies['@macts/core']).toBeUndefined()
    expect(pkg.peerDependencies).toBeUndefined()
  })

  it('defaults the version to 0.0.0', () => {
    expect(packageJson(calendarServer().files).version).toBe('0.0.0')
  })

  it('builds the single entry', () => {
    const tsup = fileContent(calendarServer().files, 'tsup.config.ts')
    expect(tsup).toContain("index: 'src/index.ts'")
    expect(tsup).not.toContain('mcp')
  })

  it('includes no api-extractor configuration (server packages are not documented)', () => {
    const result = calendarServer()
    const paths = result.files.map((f) => f.path)
    expect(paths).not.toContain('api-extractor.json')
    expect(paths).not.toContain('api-report/.gitkeep')
    expect(paths).not.toContain('temp/.gitkeep')
    expect(Object.keys(packageJson(result.files).scripts)).not.toContain('api-extractor')
  })

  it('emits a LICENSE file with the MIT license text', () => {
    const license = fileContent(calendarServer().files, 'LICENSE')
    expect(license).toContain('MIT License')
    expect(license).toContain('Copyright (c) 2026 Michael North')
    expect(license).toContain('THE SOFTWARE IS PROVIDED "AS IS"')
  })
})
