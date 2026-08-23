import { describe, it, expect } from 'vitest'
import { generateSdk } from './generate.js'
import type { AppManifest } from '../manifest/index.js'

const mockManifest: AppManifest = {
  version: '1.0',
  app: {
    bundleId: 'com.apple.iCal',
    name: 'Calendar',
    tccEntitlements: ['calendar'],
  },
  suites: [],
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'calendars',
      description: 'A calendar',
      properties: {
        name: { access: 'rw', description: 'Name', type: 'string', optional: false },
        uid: { access: 'r', description: 'UID', type: 'string', optional: false },
      },
    },
  },
  enums: {
    ViewType: {
      name: 'ViewType',
      description: 'Calendar view types',
      values: [
        { name: 'day', value: 'day', description: 'Day view' },
        { name: 'week', value: 'week', description: 'Week view' },
      ],
    },
  },
  hierarchy: {
    children: {
      calendars: {
        resource: 'Calendar',
        access: 'rw',
      },
    },
  },
  relationships: [],
  commands: {},
}

describe('generateSdk', () => {
  it('should generate files without errors', () => {
    const result = generateSdk(mockManifest, {
      outDir: '/tmp/sdk',
      packageName: '@macts/sdk-calendar',
    })

    expect(result.errors).toHaveLength(0)
    expect(result.files.length).toBeGreaterThan(0)
  })

  it('should generate package.json', () => {
    const result = generateSdk(mockManifest, {
      outDir: '/tmp/sdk',
      packageName: '@macts/sdk-calendar',
      version: '1.0.0',
    })

    const pkgFile = result.files.find((f) => f.path === 'package.json')
    expect(pkgFile).toBeDefined()
    expect(pkgFile?.content).toContain('@macts/sdk-calendar')
    expect(pkgFile?.content).toContain('1.0.0')
  })

  it('should generate package.json with npm publishing metadata', () => {
    const result = generateSdk(mockManifest, {
      outDir: '/tmp/sdk',
      packageName: '@macts/sdk-calendar',
      version: '1.0.0',
    })

    const pkgFile = result.files.find((f) => f.path === 'package.json')
    if (!pkgFile) throw new Error('package.json not found')

    const pkg = JSON.parse(pkgFile.content) as {
      license: string
      repository: { type: string; url: string; directory: string }
      publishConfig: { access: string }
    }

    expect(pkg.license).toBe('MIT')
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/mike-north/macts.git',
      directory: 'packages/sdk-calendar',
    })
    expect(pkg.publishConfig).toEqual({ access: 'public' })
  })

  it('should emit a LICENSE file with the MIT license text', () => {
    const result = generateSdk(mockManifest, {
      outDir: '/tmp/sdk',
      packageName: '@macts/sdk-calendar',
    })

    const licenseFiles = result.files.filter((f) => f.path === 'LICENSE')
    expect(licenseFiles).toHaveLength(1)
    expect(licenseFiles[0]?.content).toContain('MIT License')
    expect(licenseFiles[0]?.content).toContain('Copyright (c) 2026 Michael North')
  })

  it('should generate index file', () => {
    const result = generateSdk(mockManifest, {
      outDir: '/tmp/sdk',
      packageName: '@macts/sdk-calendar',
    })

    const indexFile = result.files.find((f) => f.path === 'src/index.ts')
    expect(indexFile).toBeDefined()
    expect(indexFile?.content).toContain('export { Calendar }')
  })

  it('should generate resource types', () => {
    const result = generateSdk(mockManifest, {
      outDir: '/tmp/sdk',
      packageName: '@macts/sdk-calendar',
    })

    const typeFiles = result.files.filter((f) => f.path.startsWith('src/types/'))
    expect(typeFiles.length).toBeGreaterThan(0)
  })

  it('should generate schemas', () => {
    const result = generateSdk(mockManifest, {
      outDir: '/tmp/sdk',
      packageName: '@macts/sdk-calendar',
    })

    const schemaFiles = result.files.filter((f) => f.path.startsWith('src/schemas/'))
    expect(schemaFiles.length).toBeGreaterThan(0)
  })
})
