/**
 * Unified orchestrator for generating all HTTP packages from a manifest.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../manifest/index.js'
import { generateHttpClientSdk, type HttpClientGeneratorOptions } from './sdk/http-client.js'
import { generateMcpPlugin } from './mcp/index.js'
import { createMcpGeneratorContext } from './mcp/context.js'
import { generateCliPlugin } from './cli/index.js'
import { generateApiPlugin } from './api/index.js'
import { generateClientPackage } from './client/index.js'
import { generateServerPackage } from './server/index.js'

/**
 * Options for generating all HTTP packages.
 */
export interface GenerateAllOptions {
  /** App name lower (e.g., "reminders") — used for directory names */
  appName: string
  /** SDK package name (defaults to @macts/sdk-{appName}) */
  sdkPackageName?: string
  /** MCP package name (defaults to @macts/{appName}-server) */
  mcpPackageName?: string
  /** CLI package name (defaults to @macts/{appName}) */
  cliPackageName?: string
  /** API package name (defaults to @macts/api-{appName}) */
  apiPackageName?: string
  /** Package version */
  version?: string | undefined
}

/**
 * Result of generating all packages.
 */
export interface GenerateAllResult {
  sdk: { dir: string; files: { path: string; content: string }[] }
  mcp: { dir: string; files: { path: string; content: string }[] }
  cli: { dir: string; files: { path: string; content: string }[] }
  api: { dir: string; files: { path: string; content: string }[] }
  errors: string[]
}

/**
 * Generate all HTTP packages (SDK, MCP, CLI, API) from a manifest.
 *
 * @param manifest - The app manifest
 * @param options - Generation options
 * @returns Generated files for all four packages
 */
export function generateAllHttpPackages(
  manifest: AppManifest,
  options: GenerateAllOptions
): GenerateAllResult {
  const { version } = options

  // Normalize appName: lowercase and replace spaces with hyphens
  const appName = options.appName.replace(/\s+/g, '-').toLowerCase()

  const sdkPackageName = options.sdkPackageName ?? `@macts/sdk-${appName}`
  const mcpPackageName = options.mcpPackageName ?? `@macts/${appName}-server`
  const cliPackageName = options.cliPackageName ?? `@macts/${appName}`
  const apiPackageName = options.apiPackageName ?? `@macts/api-${appName}`

  const errors: string[] = []

  // Generate SDK
  const sdkOptions: HttpClientGeneratorOptions = {
    packageName: sdkPackageName,
    version,
  }
  const sdkResult = generateHttpClientSdk(manifest, sdkOptions)
  errors.push(...sdkResult.errors)

  // Generate MCP plugin
  const mcpContext = createMcpGeneratorContext({
    appName,
    manifest,
    packageName: mcpPackageName,
    sdkPackageName,
    version,
  })
  const mcpResult = generateMcpPlugin(mcpContext)

  // Generate CLI plugin
  const cliResult = generateCliPlugin(manifest, {
    packageName: cliPackageName,
    sdkPackageName,
    version,
  })
  errors.push(...cliResult.errors)

  // Generate API plugin
  const apiResult = generateApiPlugin(manifest, {
    packageName: apiPackageName,
    version,
  })
  errors.push(...apiResult.errors)

  return {
    sdk: {
      dir: `sdk-${appName}`,
      files: sdkResult.files,
    },
    mcp: {
      dir: `mcp-${appName}`,
      files: mcpResult.files,
    },
    cli: {
      dir: `cli-${appName}`,
      files: cliResult.files,
    },
    api: {
      dir: `api-${appName}`,
      files: apiResult.files,
    },
    errors,
  }
}

/**
 * Options for generating consolidated packages (client + server).
 */
export interface GenerateConsolidatedOptions {
  /** App name lower (e.g., "reminders") — used for directory names */
  appName: string
  /** Client package name (defaults to @macts/{appName}) */
  clientPackageName?: string
  /** Server package name (defaults to @macts/{appName}-server) */
  serverPackageName?: string
  /** Package version */
  version?: string | undefined
}

/**
 * Result of generating consolidated packages.
 */
export interface GenerateConsolidatedResult {
  client: { dir: string; files: { path: string; content: string }[] }
  server: { dir: string; files: { path: string; content: string }[] }
  errors: string[]
}

/**
 * Generate consolidated packages (client + server) from a manifest.
 *
 * The client package combines SDK + CLI into `@macts/{app}`.
 * The server package combines API + MCP into `@macts/{app}-server`.
 *
 * @param manifest - The app manifest
 * @param options - Generation options
 * @returns Generated files for both packages
 */
export function generateConsolidatedPackages(
  manifest: AppManifest,
  options: GenerateConsolidatedOptions
): GenerateConsolidatedResult {
  // Normalize appName: lowercase and replace spaces with hyphens
  const appName = options.appName.replace(/\s+/g, '-').toLowerCase()

  const clientPackageName = options.clientPackageName ?? `@macts/${appName}`
  const serverPackageName = options.serverPackageName ?? `@macts/${appName}-server`

  const errors: string[] = []

  // Generate client package (SDK + CLI)
  const clientResult = generateClientPackage(manifest, {
    appName,
    clientPackageName,
    version: options.version,
  })
  errors.push(...clientResult.errors)

  // Generate server package (API + MCP)
  const serverResult = generateServerPackage(manifest, {
    appName,
    serverPackageName,
    clientPackageName,
    version: options.version,
  })
  errors.push(...serverResult.errors)

  return {
    client: {
      dir: clientResult.dir,
      files: clientResult.files,
    },
    server: {
      dir: serverResult.dir,
      files: serverResult.files,
    },
    errors,
  }
}
