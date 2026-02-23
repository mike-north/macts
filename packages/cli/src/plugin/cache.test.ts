import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  readPluginCache,
  writePluginCache,
  invalidatePluginCache,
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

// Mock crypto module to return predictable hashes
vi.mock('node:crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock-hash'),
  })),
}))

// Mock paths module
vi.mock('./paths.js', () => ({
  getPluginsCacheFile: vi.fn(() => '/home/user/.macts/cli-plugins-cache.json'),
  getPluginsLockfile: vi.fn(() => '/home/user/.macts/plugins/package-lock.json'),
}))

describe('readPluginCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when cache file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return null when lockfile does not exist', () => {
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      // Cache exists but lockfile doesn't
      return String(path).includes('cache.json')
    })

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return null when cache is corrupted JSON', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json{')

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return null when cache structure is invalid (missing lockfileHash)', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        plugins: [],
      })
    )

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return null when cache structure is invalid (missing plugins)', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        lockfileHash: 'some-hash',
      })
    )

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return null when cache structure is invalid (plugins not an array)', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        lockfileHash: 'some-hash',
        plugins: 'not-an-array',
      })
    )

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return null when lockfile hash does not match', () => {
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

    // Mock createHash to return different hash
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'new-hash'),
    } as unknown as crypto.Hash)

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return null when cached plugin entries have invalid shape', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (String(path).includes('cache.json')) {
        return JSON.stringify({
          lockfileHash: 'mock-hash',
          plugins: [{ packageName: '@macts/test', name: 'test' }], // missing description
        })
      }
      return 'lockfile content'
    })

    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mock-hash'),
    } as unknown as crypto.Hash)

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return null when cached plugin entry is not an object', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (String(path).includes('cache.json')) {
        return JSON.stringify({
          lockfileHash: 'mock-hash',
          plugins: ['not-an-object'],
        })
      }
      return 'lockfile content'
    })

    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mock-hash'),
    } as unknown as crypto.Hash)

    const result = readPluginCache()

    expect(result).toBeNull()
  })

  it('should return plugins when cache is valid and hash matches', () => {
    const mockPlugins: CachedPlugin[] = [
      {
        packageName: '@macts/calendar',
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

    // Mock createHash to return matching hash
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mock-hash'),
    } as unknown as crypto.Hash)

    const result = readPluginCache()

    expect(result).toEqual(mockPlugins)
  })
})

describe('writePluginCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should do nothing when no lockfile exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    writePluginCache([])

    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })

  it('should write cache file with lockfile hash and plugins', () => {
    const mockPlugins: CachedPlugin[] = [
      {
        packageName: '@macts/calendar',
        name: 'calendar',
        description: 'Calendar plugin',
      },
    ]

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('lockfile content')

    // Mock createHash to return predictable hash
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'test-hash'),
    } as unknown as crypto.Hash)

    writePluginCache(mockPlugins)

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/home/user/.macts/cli-plugins-cache.json',
      expect.stringContaining('test-hash')
    )
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/home/user/.macts/cli-plugins-cache.json',
      expect.stringContaining('"packageName": "@macts/calendar"')
    )
  })

  it('should create directory if it does not exist', () => {
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      // Lockfile exists, but cache dir doesn't
      return String(path).includes('package-lock.json')
    })
    vi.mocked(fs.readFileSync).mockReturnValue('lockfile content')

    writePluginCache([])

    expect(fs.mkdirSync).toHaveBeenCalled()
  })
})

describe('invalidatePluginCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete cache file when it exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)

    invalidatePluginCache()

    expect(fs.unlinkSync).toHaveBeenCalledWith('/home/user/.macts/cli-plugins-cache.json')
  })

  it('should do nothing when cache file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    expect(() => {
      invalidatePluginCache()
    }).not.toThrow()
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  it('should ignore errors during deletion', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.unlinkSync).mockImplementation(() => {
      throw new Error('Permission denied')
    })

    expect(() => {
      invalidatePluginCache()
    }).not.toThrow()
  })
})
