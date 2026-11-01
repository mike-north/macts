/**
 * Tests for the consolidated client package generator.
 */

import { describe, it, expect } from 'vitest'
import { generateClientPackage } from './index.js'
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
        },
        identifiers: [{ property: 'name', primary: true }],
      },
    },
    enums: {},
    hierarchy: {
      children: {
        calendars: {
          resource: 'Calendar',
          access: 'rw',
          description: 'All calendars',
        },
      },
    },
    relationships: [],
    commands: {},
  }
}

describe('generateClientPackage', () => {
  it('should generate package.json with correct structure', () => {
    const manifest = createCalendarManifest()
    const result = generateClientPackage(manifest, {
      appName: 'calendar',
      clientPackageName: '@macts/calendar',
      version: '1.2.3',
    })

    const pkgFile = result.files.find((f) => f.path === 'package.json')
    expect(pkgFile).toBeDefined()
    if (!pkgFile) throw new Error('package.json not found')

    const pkg = JSON.parse(pkgFile.content) as {
      name: string
      version: string
      license: string
      repository: { type: string; url: string; directory: string }
      publishConfig: { access: string }
    }

    expect(pkg.name).toBe('@macts/calendar')
    expect(pkg.version).toBe('1.2.3')

    // npm publishing metadata
    expect(pkg.license).toBe('MIT')
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/mike-north/macts.git',
      directory: 'packages/calendar',
    })
    expect(pkg.publishConfig).toEqual({ access: 'public' })
  })

  it('should default version to 0.0.0 when not provided', () => {
    const manifest = createCalendarManifest()
    const result = generateClientPackage(manifest, {
      appName: 'calendar',
      clientPackageName: '@macts/calendar',
    })

    const pkgFile = result.files.find((f) => f.path === 'package.json')
    if (!pkgFile) throw new Error('package.json not found')
    const pkg = JSON.parse(pkgFile.content) as { version: string }
    expect(pkg.version).toBe('0.0.0')
  })

  it('should compute the repository directory from the unscoped package name', () => {
    const manifest = createCalendarManifest()
    const result = generateClientPackage(manifest, {
      appName: 'google-chrome',
      clientPackageName: '@macts/google-chrome',
    })

    const pkgFile = result.files.find((f) => f.path === 'package.json')
    if (!pkgFile) throw new Error('package.json not found')
    const pkg = JSON.parse(pkgFile.content) as { repository: { directory: string } }
    expect(pkg.repository.directory).toBe('packages/google-chrome')
  })

  it('should emit a LICENSE file with the MIT license text', () => {
    const manifest = createCalendarManifest()
    const result = generateClientPackage(manifest, {
      appName: 'calendar',
      clientPackageName: '@macts/calendar',
    })

    const licenseFiles = result.files.filter((f) => f.path === 'LICENSE')
    expect(licenseFiles).toHaveLength(1)
    expect(licenseFiles[0]?.content).toContain('MIT License')
    expect(licenseFiles[0]?.content).toContain('Copyright (c) 2026 Michael North')
    expect(licenseFiles[0]?.content).toContain('THE SOFTWARE IS PROVIDED "AS IS"')
  })

  it('should not emit a duplicate LICENSE file from sub-generators', () => {
    const manifest = createCalendarManifest()
    const result = generateClientPackage(manifest, {
      appName: 'calendar',
      clientPackageName: '@macts/calendar',
    })

    expect(result.files.filter((f) => f.path === 'LICENSE')).toHaveLength(1)
  })
})

/**
 * The contract subpath, `@macts/<app>/contract`, mirrors `./cli`: its own
 * `exports` entry, its own tsup entry, and its own declaration output. It
 * depends only on `@macts/contracts`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D1 (subpath exports; generated packages → contracts)
 */
describe('generateClientPackage: contract subpath', () => {
  function generate(manifest: AppManifest = createCalendarManifest()) {
    return generateClientPackage(manifest, {
      appName: 'calendar',
      clientPackageName: '@macts/calendar',
      version: '1.2.3',
    })
  }

  function packageJson(result: ReturnType<typeof generate>): {
    exports: Record<string, { types: string; import: string }>
    engines: Record<string, string>
    dependencies: Record<string, string>
    scripts: Record<string, string>
  } {
    const file = result.files.find((f) => f.path === 'package.json')
    if (!file) throw new Error('package.json not found')
    return JSON.parse(file.content) as ReturnType<typeof packageJson>
  }

  it('emits the contract and manifest modules under src/contract/', () => {
    const paths = generate().files.map((f) => f.path)
    expect(paths).toContain('src/contract/index.ts')
    expect(paths).toContain('src/contract/manifest.ts')
  })

  it('exports the contract only through ./contract, beside the unchanged root and ./cli', () => {
    const pkg = packageJson(generate())
    expect(pkg.exports).toEqual({
      '.': { types: './dist/calendar.d.ts', import: './dist/index.js' },
      './cli': { types: './dist/cli.d.ts', import: './dist/cli/index.js' },
      './contract': {
        types: './dist/contract/index.d.ts',
        import: './dist/contract/index.js',
      },
    })
    const index = generate().files.find((f) => f.path === 'src/index.ts')
    expect(index?.content).not.toContain('contract')
  })

  it('builds the contract as its own tsup entry', () => {
    const tsup = generate().files.find((f) => f.path === 'tsup.config.ts')
    expect(tsup?.content).toContain(`  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'contract/index': 'src/contract/index.ts',
  },`)
  })

  it('reports the contract entry with its own API Extractor config', () => {
    const files = generate().files
    const config = files.find((f) => f.path === 'api-extractor.contract.json')
    if (!config) throw new Error('api-extractor.contract.json not found')
    // Extends the shared base like the root config; reports dist/contract's
    // declarations under api-report/ as contract.api.md; writes no rollup or
    // doc model of its own; silences only the package-tag placement message
    // that tsup's declaration output triggers.
    expect(JSON.parse(config.content)).toEqual({
      $schema:
        'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
      extends: '../../api-extractor.base.json',
      mainEntryPointFilePath: '<projectFolder>/dist/contract/index.d.ts',
      apiReport: { reportFileName: 'contract.api.md' },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      messages: {
        extractorMessageReporting: {
          'ae-misplaced-package-tag': { logLevel: 'none' },
        },
      },
    })
    expect(files.filter((f) => f.path === 'api-extractor.json')).toHaveLength(1)
    expect(packageJson(generate()).scripts).toMatchObject({
      'api-extractor':
        'api-extractor run --local && api-extractor run --local --config api-extractor.contract.json',
      'api-extractor:ci':
        'api-extractor run && api-extractor run --config api-extractor.contract.json',
    })
  })

  it('depends on @macts/contracts from the workspace', () => {
    expect(packageJson(generate()).dependencies).toEqual({
      '@macts/contracts': 'workspace:*',
      zod: 'catalog:',
    })
  })

  it('requires Node 22.13.0, the first 22.x with node:sqlite unflagged', () => {
    expect(packageJson(generate()).engines).toEqual({ node: '>=22.13.0' })
  })

  it('reports unresolvable manifest types as diagnostics, not errors', () => {
    const manifest = createCalendarManifest()
    const calendar = manifest.resources['Calendar']
    if (!calendar) throw new Error('fixture missing Calendar')
    calendar.properties['viewOptions'] = {
      access: 'r',
      type: { resource: 'view options' },
      description: 'View options',
      optional: true,
    }
    const result = generate(manifest)
    expect(result.errors).toEqual([])
    expect(result.diagnostics).toEqual([
      'calendar: resources.Calendar.properties.viewOptions: the type {"resource":"view options"} names no resource or enum, so the contract describes it as unknown.',
    ])
  })

  it('has no diagnostics when every type resolves', () => {
    expect(generate().diagnostics).toBeUndefined()
  })
})
