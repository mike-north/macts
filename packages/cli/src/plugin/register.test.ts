import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Cli, Command, CommandClass } from 'clipanion'
import { registerPlugin, registerAllPlugins } from './register.js'
import type { CliPlugin, PluginDiscoveryResult, PluginLoadError } from './types.js'

// Mock command classes for testing
class TestCommand1 extends Command {
  static override paths = [['test', 'one']]
  execute(): Promise<number> {
    return Promise.resolve(0)
  }
}

class TestCommand2 extends Command {
  static override paths = [['test', 'two']]
  execute(): Promise<number> {
    return Promise.resolve(0)
  }
}

function createMockPlugin(name: string, commands: CommandClass[] = []): CliPlugin {
  return {
    name,
    description: `${name} plugin`,
    commands,
  }
}

describe('registerPlugin', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({ binaryLabel: 'test', binaryName: 'test' })
  })

  it('should register all commands from a plugin', () => {
    const plugin = createMockPlugin('test', [
      TestCommand1 as CommandClass,
      TestCommand2 as CommandClass,
    ])
    const registerSpy = vi.spyOn(cli, 'register')

    registerPlugin(cli, plugin)

    expect(registerSpy).toHaveBeenCalledTimes(2)
    expect(registerSpy).toHaveBeenCalledWith(TestCommand1)
    expect(registerSpy).toHaveBeenCalledWith(TestCommand2)
  })

  it('should handle plugins with a single command', () => {
    const plugin = createMockPlugin('single', [TestCommand1 as CommandClass])
    const registerSpy = vi.spyOn(cli, 'register')

    registerPlugin(cli, plugin)

    expect(registerSpy).toHaveBeenCalledTimes(1)
    expect(registerSpy).toHaveBeenCalledWith(TestCommand1)
  })

  it('should handle plugins with zero commands', () => {
    const plugin = createMockPlugin('empty', [])
    const registerSpy = vi.spyOn(cli, 'register')

    registerPlugin(cli, plugin)

    expect(registerSpy).not.toHaveBeenCalled()
  })
})

describe('registerAllPlugins', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({ binaryLabel: 'test', binaryName: 'test' })
  })

  it('should register multiple plugins', () => {
    const plugin1 = createMockPlugin('plugin1', [TestCommand1 as CommandClass])
    const plugin2 = createMockPlugin('plugin2', [TestCommand2 as CommandClass])
    const discoveryResult: PluginDiscoveryResult = {
      plugins: [plugin1, plugin2],
      errors: [],
    }
    const registerSpy = vi.spyOn(cli, 'register')

    const result = registerAllPlugins(cli, discoveryResult)

    expect(registerSpy).toHaveBeenCalledTimes(2)
    expect(result.registered).toBe(2)
    expect(result.pluginNames).toEqual(['plugin1', 'plugin2'])
  })

  it('should return correct plugin count and names', () => {
    const plugin = createMockPlugin('myPlugin', [TestCommand1 as CommandClass])
    const discoveryResult: PluginDiscoveryResult = {
      plugins: [plugin],
      errors: [],
    }

    const result = registerAllPlugins(cli, discoveryResult)

    expect(result.registered).toBe(1)
    expect(result.pluginNames).toContain('myPlugin')
  })

  it('should include load errors in result', () => {
    const loadErrors: PluginLoadError[] = [
      { packageName: '@macts/broken', message: 'Module not found' },
      { packageName: '@macts/invalid', message: 'Invalid plugin export' },
    ]
    const discoveryResult: PluginDiscoveryResult = {
      plugins: [],
      errors: loadErrors,
    }

    const result = registerAllPlugins(cli, discoveryResult)

    expect(result.loadErrors).toHaveLength(2)
    expect(result.loadErrors[0]).toEqual({
      packageName: '@macts/broken',
      message: 'Module not found',
    })
    expect(result.loadErrors[1]).toEqual({
      packageName: '@macts/invalid',
      message: 'Invalid plugin export',
    })
  })

  it('should handle empty plugin list', () => {
    const discoveryResult: PluginDiscoveryResult = {
      plugins: [],
      errors: [],
    }

    const result = registerAllPlugins(cli, discoveryResult)

    expect(result.registered).toBe(0)
    expect(result.pluginNames).toEqual([])
    expect(result.loadErrors).toEqual([])
  })

  it('should handle discovery result with only errors', () => {
    const loadErrors: PluginLoadError[] = [
      { packageName: '@macts/failed', message: 'Failed to load' },
    ]
    const discoveryResult: PluginDiscoveryResult = {
      plugins: [],
      errors: loadErrors,
    }

    const result = registerAllPlugins(cli, discoveryResult)

    expect(result.registered).toBe(0)
    expect(result.pluginNames).toEqual([])
    expect(result.loadErrors).toHaveLength(1)
  })

  it('should handle mixed plugins and errors', () => {
    const plugin = createMockPlugin('working', [TestCommand1 as CommandClass])
    const loadErrors: PluginLoadError[] = [{ packageName: '@macts/broken', message: 'Load failed' }]
    const discoveryResult: PluginDiscoveryResult = {
      plugins: [plugin],
      errors: loadErrors,
    }

    const result = registerAllPlugins(cli, discoveryResult)

    expect(result.registered).toBe(1)
    expect(result.pluginNames).toEqual(['working'])
    expect(result.loadErrors).toHaveLength(1)
  })
})
