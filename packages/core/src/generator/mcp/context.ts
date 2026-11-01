/**
 * MCP generator context creation.
 *
 * @packageDocumentation
 */

import type { AppManifest, Resource, Command } from '../../manifest/index.js'
import {
  isUnsupportedResourceKey,
  usableCommands,
  usableResources,
} from '../../manifest/unsupported.js'
import type { McpGeneratorContext } from './types.js'

/**
 * Options for creating MCP generator context.
 */
export interface CreateMcpContextOptions {
  /** Application name */
  appName: string
  /** App manifest */
  manifest: AppManifest
  /** Package name (defaults to @macts/{appName}-server) */
  packageName?: string
  /** SDK package name (defaults to @macts/sdk-{appName}) */
  sdkPackageName?: string
  /** Package version */
  version?: string | undefined
}

/**
 * Create an MCP generator context.
 *
 * @param options - Context creation options
 * @returns MCP generator context
 */
export function createMcpGeneratorContext(options: CreateMcpContextOptions): McpGeneratorContext {
  const { appName, manifest, version } = options
  const packageName = options.packageName ?? `@macts/${appName.toLowerCase()}-server`
  const sdkPackageName = options.sdkPackageName ?? `@macts/sdk-${appName.toLowerCase()}`

  return {
    appName,
    manifest,
    packageName,
    sdkPackageName,
    version,
  }
}

/**
 * Get the usable resources from a manifest: every resource except those marked
 * unsupported, which have no tools or capabilities.
 *
 * @param manifest - App manifest
 * @returns Array of resources
 */
export function getResources(manifest: AppManifest): Resource[] {
  return usableResources(manifest).map(([, resource]) => resource)
}

/**
 * Get all application-level commands from manifest, except those marked
 * unsupported.
 *
 * @param manifest - App manifest
 * @returns Array of application commands
 */
export function getAppCommands(manifest: AppManifest): Command[] {
  return usableCommands(manifest)
    .map(([, cmd]) => cmd)
    .filter((cmd) => cmd.scope === 'application')
}

/**
 * Get resource-scoped commands that apply to a specific resource: none for a
 * resource marked unsupported, and none marked unsupported itself.
 *
 * @param manifest - App manifest
 * @param resourceName - Resource name
 * @returns Array of commands for this resource
 */
export function getResourceCommands(manifest: AppManifest, resourceName: string): Command[] {
  if (isUnsupportedResourceKey(manifest, resourceName)) return []
  return usableCommands(manifest)
    .map(([, cmd]) => cmd)
    .filter((cmd) => {
      if (cmd.scope !== 'resource') return false
      if (!cmd.resourceType) return true // Applies to all resources
      if (Array.isArray(cmd.resourceType)) {
        return cmd.resourceType.includes(resourceName)
      }
      return cmd.resourceType === resourceName
    })
}
