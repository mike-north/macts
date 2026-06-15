/**
 * Plugin cache for fast CLI startup.
 *
 * Caches discovered plugin metadata and only refreshes when the
 * plugins lockfile changes.
 *
 * @packageDocumentation
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import { getPluginsCacheFile, getPluginsLockfile } from './paths.js'

/**
 * Cached plugin entry.
 */
export interface CachedPlugin {
  /** Package name (e.g., "@macts/calendar") */
  readonly packageName: string
  /** Plugin name (e.g., "calendar") */
  readonly name: string
  /** Plugin description */
  readonly description: string
}

/**
 * Plugin cache structure.
 */
interface PluginCache {
  /** Hash of the lockfile when cache was created */
  readonly lockfileHash: string
  /** Cached plugin metadata */
  readonly plugins: readonly CachedPlugin[]
}

/**
 * Read the plugin cache if valid.
 *
 * Returns null if:
 * - Cache file doesn't exist
 * - Lockfile has changed since cache was created
 * - Cache file is corrupted
 *
 * @returns Cached plugins or null if cache is invalid
 */
export function readPluginCache(): readonly CachedPlugin[] | null {
  const cacheFile = getPluginsCacheFile()
  const lockfile = getPluginsLockfile()

  // No cache file
  if (!existsSync(cacheFile)) {
    return null
  }

  // No lockfile means no plugins installed
  if (!existsSync(lockfile)) {
    return null
  }

  try {
    const cacheContent = readFileSync(cacheFile, 'utf-8')
    const cache = JSON.parse(cacheContent) as PluginCache

    // Validate cache structure
    if (!cache.lockfileHash || !Array.isArray(cache.plugins)) {
      return null
    }

    // Check if lockfile has changed
    const currentHash = hashFile(lockfile)
    if (cache.lockfileHash !== currentHash) {
      return null
    }

    // Validate plugin entries
    if (!cache.plugins.every(isValidCachedPlugin)) {
      return null
    }

    return cache.plugins
  } catch {
    return null
  }
}

/**
 * Write the plugin cache.
 *
 * @param plugins - Plugin metadata to cache
 */
export function writePluginCache(plugins: readonly CachedPlugin[]): void {
  const cacheFile = getPluginsCacheFile()
  const lockfile = getPluginsLockfile()

  // Can't cache without a lockfile
  if (!existsSync(lockfile)) {
    return
  }

  const cache: PluginCache = {
    lockfileHash: hashFile(lockfile),
    plugins,
  }

  // Ensure directory exists
  const dir = dirname(cacheFile)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(cacheFile, JSON.stringify(cache, null, 2))
}

/**
 * Invalidate the plugin cache.
 *
 * Call this after installing or uninstalling plugins.
 */
export function invalidatePluginCache(): void {
  const cacheFile = getPluginsCacheFile()
  if (existsSync(cacheFile)) {
    try {
      unlinkSync(cacheFile)
    } catch {
      // Ignore errors - cache will be stale but still functional
    }
  }
}

/**
 * Compute SHA-256 hash of a file.
 */
function hashFile(filePath: string): string {
  const content = readFileSync(filePath)
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Type guard for CachedPlugin.
 */
function isValidCachedPlugin(obj: unknown): obj is CachedPlugin {
  if (!obj || typeof obj !== 'object') return false
  const plugin = obj as Record<string, unknown>
  return (
    typeof plugin['packageName'] === 'string' &&
    typeof plugin['name'] === 'string' &&
    typeof plugin['description'] === 'string'
  )
}
