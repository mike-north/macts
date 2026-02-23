import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  readMcpPluginCache,
  writeMcpPluginCache,
  invalidateMcpPluginCache,
  type CachedPlugin,
} from './cache.js'
import * as fs from 'node:fs'
import * as crypto from 'node:crypto'

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

// Mock crypto module
vi.mock('node:crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock-hash'),
  })),
}))

describe('readMcpPluginCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when cache file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const result = readMcpPluginCache()
    expect(result).toBeNull()
  })

  it('should return null when lockfile does not exist', () => {
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      // Cache exists but lockfile doesn't
      return String(path).includes('cache.json')
    })

    const result = readMcpPluginCache()
    expect(result).toBeNull()
  })

  it('should return null when cache is corrupted', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

    const result = readMcpPluginCache()
    expect(result).toBeNull()
  })

  it('should return null when cache has invalid structure', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('{"invalid": true}')

    const result = readMcpPluginCache()
    expect(result).toBeNull()
  })

  it('should return null when lockfile hash changed', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (String(path).includes('cache.json')) {
        return JSON.stringify({
          lockfileHash: 'old-hash',
          plugins: [],
        })
      }
      return 'lockfile content'
    })

    // Mock hash returns different value
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'new-hash'),
    } as unknown as crypto.Hash)

    const result = readMcpPluginCache()
    expect(result).toBeNull()
  })

  it('should return cached plugins when valid', () => {
    const mockPlugins: CachedPlugin[] = [
      {
        packageName: '@macts/mcp-calendar',
        name: 'calendar',
        description: 'Calendar plugin',
      },
    ]

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (String(path).includes('cache.json')) {
        return JSON.stringify({
          lockfileHash: 'mock-hash',
          plugins: mockPlugins,
        })
      }
      return 'lockfile content'
    })

    // Ensure crypto hash returns the same hash as in the cache
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mock-hash'),
    } as unknown as crypto.Hash)

    const result = readMcpPluginCache()
    expect(result).toEqual(mockPlugins)
  })
})

describe('writeMcpPluginCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not write when lockfile does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    writeMcpPluginCache([])

    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })

  it('should write cache when lockfile exists', () => {
    const mockPlugins: CachedPlugin[] = [
      {
        packageName: '@macts/mcp-calendar',
        name: 'calendar',
        description: 'Calendar plugin',
      },
    ]

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('lockfile content')

    // Mock crypto hash to return consistent value
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'test-hash'),
    } as unknown as crypto.Hash)

    writeMcpPluginCache(mockPlugins)

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('mcp-plugins-cache.json'),
      expect.stringContaining('test-hash')
    )
  })

  it('should create directory if it does not exist', () => {
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      // Lockfile exists, but cache dir doesn't
      return String(path).includes('package-lock.json')
    })
    vi.mocked(fs.readFileSync).mockReturnValue('lockfile content')

    writeMcpPluginCache([])

    expect(fs.mkdirSync).toHaveBeenCalled()
  })
})

describe('invalidateMcpPluginCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete cache file if it exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)

    invalidateMcpPluginCache()

    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('mcp-plugins-cache.json'))
  })

  it('should not error if cache file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    expect(() => {
      invalidateMcpPluginCache()
    }).not.toThrow()
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  it('should ignore errors when deleting cache file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.unlinkSync).mockImplementation(() => {
      throw new Error('Permission denied')
    })

    expect(() => {
      invalidateMcpPluginCache()
    }).not.toThrow()
  })
})

describe('cache edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle empty plugin list', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('lockfile content')

    writeMcpPluginCache([])

    expect(fs.writeFileSync).toHaveBeenCalled()
  })

  it('should handle large plugin list', () => {
    const manyPlugins: CachedPlugin[] = Array.from({ length: 100 }, (_, i) => ({
      packageName: `@macts/mcp-plugin-${i.toString()}`,
      name: `plugin-${i.toString()}`,
      description: `Plugin ${i.toString()}`,
    }))

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (String(path).includes('cache.json')) {
        return JSON.stringify({
          lockfileHash: 'mock-hash',
          plugins: manyPlugins,
        })
      }
      return 'lockfile content'
    })

    // Mock crypto hash to return consistent value
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mock-hash'),
    } as unknown as crypto.Hash)

    const result = readMcpPluginCache()
    expect(result).toEqual(manyPlugins)
  })
})
