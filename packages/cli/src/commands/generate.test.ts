import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GenerateCommand } from './generate.js'
import * as core from '@macts/core'
import type { Writable } from 'node:stream'
import type { BaseContext } from 'clipanion'

// Mock the core module
vi.mock('@macts/core', async () => {
  const actual = await vi.importActual<typeof core>('@macts/core')
  return {
    ...actual,
    loadManifest: vi.fn(),
    generateConsolidatedPackages: vi.fn(),
    generateClientPackage: vi.fn(),
    generateServerPackage: vi.fn(),
    writeFiles: vi.fn(),
  }
})

describe('GenerateCommand', () => {
  let stdout: string[]
  let stderr: string[]
  let mockStdout: Writable
  let mockStderr: Writable

  beforeEach(() => {
    stdout = []
    stderr = []

    // Create mock writable streams
    mockStdout = {
      write: (chunk: string) => {
        stdout.push(chunk)
        return true
      },
    } as Writable

    mockStderr = {
      write: (chunk: string) => {
        stderr.push(chunk)
        return true
      },
    } as Writable

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create a properly typed test context
  function createTestContext(): BaseContext {
    return {
      stdin: process.stdin,
      stdout: mockStdout,
      stderr: mockStderr,
      env: process.env,
      colorDepth: 8,
    }
  }

  const mockManifest = {
    version: '1.0' as const,
    app: {
      name: 'Calendar',
      bundleId: 'com.apple.Calendar',
      tccEntitlements: [],
    },
    suites: [],
    resources: {},
    commands: {},
    enums: {},
    hierarchy: { children: {} },
    relationships: [],
  }

  describe('command parsing', () => {
    it('should have correct command path', () => {
      expect(GenerateCommand.paths).toEqual([['generate']])
    })

    it('should define usage information', () => {
      expect(GenerateCommand.usage).toBeDefined()
      expect(GenerateCommand.usage.description).toContain('Generate')
    })
  })

  describe('--target all', () => {
    it('should generate all packages successfully', async () => {
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest)
      vi.mocked(core.generateConsolidatedPackages).mockReturnValue({
        client: { dir: 'calendar', files: [{ path: 'src/index.ts', content: '' }] },
        server: { dir: 'calendar-server', files: [{ path: 'src/index.ts', content: '' }] },
        errors: [],
      })
      vi.mocked(core.writeFiles).mockResolvedValue(undefined)

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages'
      command.target = 'all'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(0)
      expect(core.generateConsolidatedPackages).toHaveBeenCalledWith(
        mockManifest,
        expect.objectContaining({
          appName: 'calendar',
        })
      )
      expect(core.writeFiles).toHaveBeenCalledTimes(2)
      expect(stdout.join('')).toContain('Writing 2 files')
      expect(stdout.join('')).toContain('Generated packages')
    })

    it('should report errors from all-target generation', async () => {
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest)
      vi.mocked(core.generateConsolidatedPackages).mockReturnValue({
        client: { dir: 'calendar', files: [] },
        server: { dir: 'calendar-server', files: [] },
        errors: ['SDK generation failed'],
      })

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages'
      command.target = 'all'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(1)
      expect(stderr.join('')).toContain('SDK generation failed')
    })

    it('should default to all target when not specified', async () => {
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest)
      vi.mocked(core.generateConsolidatedPackages).mockReturnValue({
        client: { dir: 'calendar', files: [] },
        server: { dir: 'calendar-server', files: [] },
        errors: [],
      })
      vi.mocked(core.writeFiles).mockResolvedValue(undefined)

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages'
      // target not set — should default to 'all'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(0)
      expect(core.generateConsolidatedPackages).toHaveBeenCalled()
    })
  })

  describe('--target client', () => {
    it('should generate client package', async () => {
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest)
      vi.mocked(core.generateClientPackage).mockReturnValue({
        dir: 'calendar',
        files: [{ path: 'src/index.ts', content: '' }],
        errors: [],
      })
      vi.mocked(core.writeFiles).mockResolvedValue(undefined)

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages/calendar'
      command.target = 'client'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(0)
      expect(core.generateClientPackage).toHaveBeenCalled()
      expect(core.writeFiles).toHaveBeenCalled()
      expect(stdout.join('')).toContain('Package generated successfully!')
    })

    it('should use custom package name', async () => {
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest)
      vi.mocked(core.generateClientPackage).mockReturnValue({
        dir: 'calendar',
        files: [{ path: 'src/index.ts', content: '' }],
        errors: [],
      })
      vi.mocked(core.writeFiles).mockResolvedValue(undefined)

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages/calendar'
      command.target = 'client'
      command.packageName = '@custom/calendar'
      command.context = createTestContext()

      await command.execute()

      expect(core.generateClientPackage).toHaveBeenCalledWith(
        mockManifest,
        expect.objectContaining({
          clientPackageName: '@custom/calendar',
        })
      )
    })

    it('should report client generation errors', async () => {
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest)
      vi.mocked(core.generateClientPackage).mockReturnValue({
        dir: 'calendar',
        files: [],
        errors: ['Resource not found'],
      })

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages/calendar'
      command.target = 'client'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(1)
      expect(stderr.join('')).toContain('Resource not found')
    })
  })

  describe('--target server', () => {
    it('should generate server package', async () => {
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest)
      vi.mocked(core.generateServerPackage).mockReturnValue({
        dir: 'calendar-server',
        files: [{ path: 'src/index.ts', content: '' }],
        errors: [],
      })
      vi.mocked(core.writeFiles).mockResolvedValue(undefined)

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages/calendar-server'
      command.target = 'server'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(0)
      expect(core.generateServerPackage).toHaveBeenCalled()
      expect(core.writeFiles).toHaveBeenCalled()
      expect(stdout.join('')).toContain('Package generated successfully!')
    })

    it('should report server generation errors', async () => {
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest)
      vi.mocked(core.generateServerPackage).mockReturnValue({
        dir: 'calendar-server',
        files: [],
        errors: ['Manifest serialization failed'],
      })

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages/calendar-server'
      command.target = 'server'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(1)
      expect(stderr.join('')).toContain('Manifest serialization failed')
    })
  })

  describe('error handling', () => {
    it('should handle manifest load errors', async () => {
      vi.mocked(core.loadManifest).mockRejectedValue(
        new Error('Invalid manifest: missing app.bundleId')
      )

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/invalid/app.yaml'
      command.outDir = 'packages/invalid'
      command.target = 'all'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(1)
      expect(stderr.join('')).toContain('Error:')
      expect(stderr.join('')).toContain('Invalid manifest: missing app.bundleId')
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(core.loadManifest).mockRejectedValue('Something went wrong')

      const command = new GenerateCommand()
      command.manifestPath = 'manifests/calendar/app.yaml'
      command.outDir = 'packages/calendar'
      command.target = 'all'
      command.context = createTestContext()

      const exitCode = await command.execute()

      expect(exitCode).toBe(1)
      expect(stderr.join('')).toContain('Unknown error:')
      expect(stderr.join('')).toContain('Something went wrong')
    })
  })
})
