/**
 * MCP plugin utilities.
 *
 * @packageDocumentation
 */

export { discoverMcpPlugins, loadMcpPlugin } from './loader.js'
export { readMcpPluginCache, writeMcpPluginCache, invalidateMcpPluginCache } from './cache.js'
export {
  getMactsHome,
  getPluginsDir,
  getPluginsNodeModules,
  getPluginsLockfile,
  getMcpPluginsCacheFile,
} from './paths.js'
export type { PluginDiscoveryResult, PluginLoadError } from './types.js'
export type { CachedPlugin } from './cache.js'
