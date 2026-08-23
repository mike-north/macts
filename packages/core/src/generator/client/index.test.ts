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
