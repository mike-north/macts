import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type SpawnSyncReturns } from 'node:child_process'
import {
  initializePluginsDir,
  installPlugin,
  uninstallPlugin,
  listInstalledPlugins,
  getPluginResolutionPath,
  findInstalledPluginPackages,
  resolveMcpServerPackageName,
  installMcpServerPlugin,
  uninstallMcpServerPlugin,
  listInstalledMcpServerPlugins,
} from './manager.js'

// Mock child_process module
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}))

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(),
}))

// Mock paths module
vi.mock('./paths.js', () => ({
  getPluginsDir: vi.fn(() => '/home/user/.macts/plugins'),
  getPluginsPackageJson: vi.fn(() => '/home/user/.macts/plugins/package.json'),
  getPluginsNodeModules: vi.fn(() => '/home/user/.macts/plugins/node_modules'),
}))

// Mock cache module
vi.mock('./cache.js', () => ({
  invalidatePluginCache: vi.fn(),
}))

describe('initializePluginsDir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create directory when it does not exist', async () => {
    const { existsSync, mkdirSync, writeFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(false)

    initializePluginsDir()

    expect(mkdirSync).toHaveBeenCalledWith('/home/user/.macts/plugins', { recursive: true })
    expect(writeFileSync).toHaveBeenCalledWith(
      '/home/user/.macts/plugins/package.json',
      expect.stringContaining('"name": "macts-plugins"')
    )
  })

  it('should create package.json when it does not exist', async () => {
    const { existsSync, mkdirSync, writeFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockImplementation((path) => {
      // Directory exists but package.json doesn't
      return !String(path).includes('package.json')
    })

    initializePluginsDir()

    expect(mkdirSync).not.toHaveBeenCalled()
    expect(writeFileSync).toHaveBeenCalledWith(
      '/home/user/.macts/plugins/package.json',
      expect.stringContaining('"name": "macts-plugins"')
    )
  })

  it('should do nothing when both exist', async () => {
    const { existsSync, mkdirSync, writeFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)

    initializePluginsDir()

    expect(mkdirSync).not.toHaveBeenCalled()
    expect(writeFileSync).not.toHaveBeenCalled()
  })
})

describe('installPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject invalid package names (non-scoped)', () => {
    const result = installPlugin('calendar')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject invalid package names (wrong scope)', () => {
    const result = installPlugin('@other/calendar')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject invalid package names (empty)', () => {
    const result = installPlugin('')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject infrastructure packages (core)', () => {
    const result = installPlugin('@macts/core')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject infrastructure packages (api)', () => {
    const result = installPlugin('@macts/api')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject infrastructure packages (cli)', () => {
    const result = installPlugin('@macts/cli')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject infrastructure packages (mcp)', () => {
    const result = installPlugin('@macts/mcp')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject server packages', () => {
    const result = installPlugin('@macts/calendar-server')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject invalid version specifiers (URLs)', async () => {
    const { existsSync } = await import('node:fs')
    vi.mocked(existsSync).mockReturnValue(true)

    const result = installPlugin('@macts/calendar', 'https://example.com/package.tgz')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid version specifier')
  })

  it('should reject invalid version specifiers (file paths)', async () => {
    const { existsSync } = await import('node:fs')
    vi.mocked(existsSync).mockReturnValue(true)

    const result = installPlugin('@macts/calendar', '/path/to/package.tgz')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid version specifier')
  })

  it('should reject invalid version specifiers (git refs)', async () => {
    const { existsSync } = await import('node:fs')
    vi.mocked(existsSync).mockReturnValue(true)

    const result = installPlugin('@macts/calendar', 'git+https://github.com/example/repo.git')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid version specifier')
  })

  it('should accept valid version specifiers (semver)', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')
    const { invalidatePluginCache } = await import('./cache.js')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = installPlugin('@macts/calendar', '1.2.3')

    expect(result.success).toBe(true)
    expect(spawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '--ignore-scripts', '@macts/calendar@1.2.3'],
      expect.objectContaining({
        cwd: '/home/user/.macts/plugins',
      })
    )
    expect(invalidatePluginCache).toHaveBeenCalled()
  })

  it('should accept valid version specifiers (tags)', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = installPlugin('@macts/calendar', 'beta')

    expect(result.success).toBe(true)
  })

  it('should accept valid version specifiers (ranges)', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = installPlugin('@macts/calendar', '^1.0.0')

    expect(result.success).toBe(true)
  })

  it('should accept valid version specifiers (latest)', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = installPlugin('@macts/calendar', 'latest')

    expect(result.success).toBe(true)
  })

  it('should call npm install with correct args (--ignore-scripts)', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    installPlugin('@macts/calendar', '1.0.0')

    expect(spawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '--ignore-scripts', '@macts/calendar@1.0.0'],
      expect.objectContaining({
        cwd: '/home/user/.macts/plugins',
        stdio: 'pipe',
        encoding: 'utf-8',
      })
    )
  })

  it('should return success message on npm success', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = installPlugin('@macts/calendar', '1.0.0')

    expect(result.success).toBe(true)
    expect(result.message).toBe('Installed @macts/calendar@1.0.0')
  })

  it('should return error message on npm failure (non-zero exit)', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'Package not found',
    } as SpawnSyncReturns<string>)

    const result = installPlugin('@macts/calendar', '1.0.0')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to install')
    expect(result.message).toContain('Package not found')
  })

  it('should call invalidatePluginCache after successful install', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')
    const { invalidatePluginCache } = await import('./cache.js')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    installPlugin('@macts/calendar', '1.0.0')

    expect(invalidatePluginCache).toHaveBeenCalled()
  })

  it('should use latest as default version', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    installPlugin('@macts/calendar')

    expect(spawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '--ignore-scripts', '@macts/calendar'],
      expect.anything()
    )
  })
})

describe('uninstallPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject invalid package names', () => {
    const result = uninstallPlugin('invalid-package')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject infrastructure packages', () => {
    const result = uninstallPlugin('@macts/core')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should reject server packages', () => {
    const result = uninstallPlugin('@macts/calendar-server')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid plugin package name')
  })

  it('should return error when plugins not installed (no package.json)', async () => {
    const { existsSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(false)

    const result = uninstallPlugin('@macts/calendar')

    expect(result.success).toBe(false)
    expect(result.message).toContain('not installed')
  })

  it('should call npm uninstall with correct args', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    uninstallPlugin('@macts/calendar')

    expect(spawnSync).toHaveBeenCalledWith(
      'npm',
      ['uninstall', '@macts/calendar'],
      expect.objectContaining({
        cwd: '/home/user/.macts/plugins',
        stdio: 'pipe',
        encoding: 'utf-8',
      })
    )
  })

  it('should return success message on npm success', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = uninstallPlugin('@macts/calendar')

    expect(result.success).toBe(true)
    expect(result.message).toBe('Uninstalled @macts/calendar')
  })

  it('should return error on npm failure', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'Error uninstalling',
    } as SpawnSyncReturns<string>)

    const result = uninstallPlugin('@macts/calendar')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to uninstall')
    expect(result.message).toContain('Error uninstalling')
  })

  it('should call invalidatePluginCache after successful uninstall', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')
    const { invalidatePluginCache } = await import('./cache.js')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    uninstallPlugin('@macts/calendar')

    expect(invalidatePluginCache).toHaveBeenCalled()
  })
})

describe('listInstalledPlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty when no package.json', async () => {
    const { existsSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(false)

    const result = listInstalledPlugins()

    expect(result).toEqual([])
  })

  it('should return empty when no dependencies', async () => {
    const { existsSync, readFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        name: 'macts-plugins',
        version: '1.0.0',
      })
    )

    const result = listInstalledPlugins()

    expect(result).toEqual([])
  })

  it('should return plugins from dependencies', async () => {
    const { existsSync, readFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        name: 'macts-plugins',
        version: '1.0.0',
        dependencies: {
          '@macts/calendar': '1.0.0',
          '@macts/contacts': '2.1.0',
        },
      })
    )

    const result = listInstalledPlugins()

    expect(result).toEqual([
      { packageName: '@macts/calendar', version: '1.0.0' },
      { packageName: '@macts/contacts', version: '2.1.0' },
    ])
  })

  it('should filter out infrastructure packages', async () => {
    const { existsSync, readFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        name: 'macts-plugins',
        version: '1.0.0',
        dependencies: {
          '@macts/calendar': '1.0.0',
          '@macts/core': '1.0.0',
          '@macts/api': '1.0.0',
          '@macts/cli': '1.0.0',
          '@macts/mcp': '1.0.0',
        },
      })
    )

    const result = listInstalledPlugins()

    expect(result).toEqual([{ packageName: '@macts/calendar', version: '1.0.0' }])
  })

  it('should filter out server packages', async () => {
    const { existsSync, readFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        name: 'macts-plugins',
        version: '1.0.0',
        dependencies: {
          '@macts/calendar': '1.0.0',
          '@macts/calendar-server': '1.0.0',
        },
      })
    )

    const result = listInstalledPlugins()

    expect(result).toEqual([{ packageName: '@macts/calendar', version: '1.0.0' }])
  })

  it('should handle corrupted/unparseable package.json', async () => {
    const { existsSync, readFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('invalid json')

    const result = listInstalledPlugins()

    expect(result).toEqual([])
  })
})

describe('getPluginResolutionPath', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return node_modules path when it exists', async () => {
    const { existsSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)

    const result = getPluginResolutionPath()

    expect(result).toBe('/home/user/.macts/plugins/node_modules')
  })

  it('should return null when it does not exist', async () => {
    const { existsSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(false)

    const result = getPluginResolutionPath()

    expect(result).toBeNull()
  })
})

describe('findInstalledPluginPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty when no node_modules', async () => {
    const { existsSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(false)

    const result = findInstalledPluginPackages()

    expect(result).toEqual([])
  })

  it('should return empty when no @macts scope dir', async () => {
    const { existsSync } = await import('node:fs')

    vi.mocked(existsSync).mockImplementation((path) => {
      // node_modules exists but @macts doesn't
      return !String(path).includes('@macts')
    })

    const result = findInstalledPluginPackages()

    expect(result).toEqual([])
  })

  it('should return @macts/* packages', async () => {
    const { existsSync, readdirSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockReturnValue(['calendar', 'contacts'] as unknown as never[])

    const result = findInstalledPluginPackages()

    expect(result).toEqual(['@macts/calendar', '@macts/contacts'])
  })

  it('should filter out *-server packages', async () => {
    const { existsSync, readdirSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockReturnValue([
      'calendar',
      'calendar-server',
      'contacts',
    ] as unknown as never[])

    const result = findInstalledPluginPackages()

    expect(result).toEqual(['@macts/calendar', '@macts/contacts'])
  })

  it('should filter out infrastructure packages (core, api, cli, mcp)', async () => {
    const { existsSync, readdirSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockReturnValue([
      'calendar',
      'core',
      'api',
      'cli',
      'mcp',
    ] as unknown as never[])

    const result = findInstalledPluginPackages()

    expect(result).toEqual(['@macts/calendar'])
  })

  it('should handle readdir errors', async () => {
    const { existsSync, readdirSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const result = findInstalledPluginPackages()

    expect(result).toEqual([])
  })
})

describe('resolveMcpServerPackageName', () => {
  it('should synthesize @macts/<app>-server from a bare app name', () => {
    expect(resolveMcpServerPackageName('calendar')).toBe('@macts/calendar-server')
  })

  it('should accept a hyphenated app name', () => {
    expect(resolveMcpServerPackageName('google-chrome')).toBe('@macts/google-chrome-server')
  })

  it('should pass through a fully-qualified @macts/<app>-server name', () => {
    expect(resolveMcpServerPackageName('@macts/calendar-server')).toBe('@macts/calendar-server')
  })

  it('should reject a bare app name that already ends in -server', () => {
    // Passing "calendar-server" as a bare slug would produce the nonsense package
    // "@macts/calendar-server-server". The resolver must return null so callers
    // know to either treat it as a fully-qualified name or reject it outright.
    expect(resolveMcpServerPackageName('calendar-server')).toBeNull()
  })

  it('should reject a wrong-scope server package', () => {
    expect(resolveMcpServerPackageName('@other/calendar-server')).toBeNull()
  })

  it('should reject a CLI (non-server) scoped package name', () => {
    expect(resolveMcpServerPackageName('@macts/calendar')).toBeNull()
  })

  it('should reject infrastructure app names', () => {
    expect(resolveMcpServerPackageName('core')).toBeNull()
    expect(resolveMcpServerPackageName('mcp')).toBeNull()
    expect(resolveMcpServerPackageName('@macts/core-server')).toBeNull()
  })

  it('should reject empty input', () => {
    expect(resolveMcpServerPackageName('')).toBeNull()
  })

  it('should reject names with invalid characters', () => {
    expect(resolveMcpServerPackageName('Calendar')).toBeNull()
    expect(resolveMcpServerPackageName('cal endar')).toBeNull()
    expect(resolveMcpServerPackageName('../evil')).toBeNull()
  })
})

describe('installMcpServerPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should install @macts/<app>-server into the plugins dir from a bare app name', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')
    const { invalidatePluginCache } = await import('./cache.js')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = installMcpServerPlugin('calendar')

    expect(result.success).toBe(true)
    // Discovery looks for @macts/<app>-server in ~/.macts/plugins/node_modules/@macts/,
    // so install must place exactly that package into the plugins dir.
    expect(spawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '--ignore-scripts', '@macts/calendar-server'],
      expect.objectContaining({ cwd: '/home/user/.macts/plugins' })
    )
    expect(invalidatePluginCache).toHaveBeenCalled()
  })

  it('should install from a fully-qualified package name', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = installMcpServerPlugin('@macts/calendar-server')

    expect(result.success).toBe(true)
    expect(spawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '--ignore-scripts', '@macts/calendar-server'],
      expect.anything()
    )
  })

  it('should pass a version specifier through to npm', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    installMcpServerPlugin('calendar', '1.2.3')

    expect(spawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '--ignore-scripts', '@macts/calendar-server@1.2.3'],
      expect.anything()
    )
  })

  it('should reject a nonexistent/invalid app name without invoking npm', async () => {
    const { spawnSync } = await import('node:child_process')

    const result = installMcpServerPlugin('@other/calendar-server')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid MCP server plugin')
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('should reject a non-@macts (CLI) package name', async () => {
    const { spawnSync } = await import('node:child_process')

    const result = installMcpServerPlugin('@macts/calendar')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid MCP server plugin')
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('should reject an invalid version specifier', async () => {
    const { existsSync } = await import('node:fs')
    vi.mocked(existsSync).mockReturnValue(true)

    const result = installMcpServerPlugin('calendar', 'https://evil.example/pkg.tgz')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid version specifier')
  })

  it('should surface npm failures (e.g. package not found on registry)', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 1,
      stdout: '',
      stderr: '404 Not Found - @macts/nonexistent-server',
    } as SpawnSyncReturns<string>)

    const result = installMcpServerPlugin('nonexistent')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to install')
    expect(result.message).toContain('404 Not Found')
  })
})

describe('uninstallMcpServerPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should uninstall @macts/<app>-server from a bare app name', async () => {
    const { existsSync } = await import('node:fs')
    const { spawnSync } = await import('node:child_process')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    } as SpawnSyncReturns<string>)

    const result = uninstallMcpServerPlugin('calendar')

    expect(result.success).toBe(true)
    expect(spawnSync).toHaveBeenCalledWith(
      'npm',
      ['uninstall', '@macts/calendar-server'],
      expect.anything()
    )
  })

  it('should reject an invalid app name without invoking npm', async () => {
    const { spawnSync } = await import('node:child_process')

    const result = uninstallMcpServerPlugin('@macts/calendar')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid MCP server plugin')
    expect(spawnSync).not.toHaveBeenCalled()
  })
})

describe('listInstalledMcpServerPlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty when no package.json', async () => {
    const { existsSync } = await import('node:fs')
    vi.mocked(existsSync).mockReturnValue(false)

    expect(listInstalledMcpServerPlugins()).toEqual([])
  })

  it('should return only @macts/<app>-server dependencies', async () => {
    const { existsSync, readFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        name: 'macts-plugins',
        version: '1.0.0',
        dependencies: {
          '@macts/calendar': '1.0.0',
          '@macts/calendar-server': '1.0.0',
          '@macts/contacts-server': '2.1.0',
        },
      })
    )

    // Server packages are what the MCP daemon discovers; CLI plugins are excluded.
    expect(listInstalledMcpServerPlugins()).toEqual([
      { packageName: '@macts/calendar-server', version: '1.0.0' },
      { packageName: '@macts/contacts-server', version: '2.1.0' },
    ])
  })

  it('should handle corrupted package.json', async () => {
    const { existsSync, readFileSync } = await import('node:fs')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('not json')

    expect(listInstalledMcpServerPlugins()).toEqual([])
  })
})
