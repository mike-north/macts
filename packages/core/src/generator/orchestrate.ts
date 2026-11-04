/**
 * Generates both of an app's packages from its manifest: the client package
 * (`@macts/<app>`) and the contract-only server package
 * (`@macts/<app>-server`).
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../manifest/index.js'
import { generateClientPackage } from './client/index.js'
import { generateServerPackage } from './server/index.js'
import { generationRefusals } from './surface.js'

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
  /**
   * Non-fatal findings, such as manifest types the contract could not resolve
   * and describes as `unknown`. Present only when there are any.
   */
  diagnostics?: string[]
}

/**
 * Generate consolidated packages (client + server) from a manifest.
 *
 * The client package combines the SDK, the CLI and the contract into
 * `@macts/{app}`. The server package, `@macts/{app}-server`, re-exports that
 * contract.
 *
 * A manifest with a command that must select one item and declares no
 * identifier parameter is refused before either package is built
 * (`generationRefusals`): the result holds the errors naming each such
 * command, once, and no files.
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

  const refusals = generationRefusals(manifest)
  if (refusals.length > 0) {
    return {
      client: { dir: appName, files: [] },
      server: { dir: serverPackageName.replace(/^@[^/]+\//, ''), files: [] },
      errors: refusals,
    }
  }

  const errors: string[] = []

  // Generate client package (SDK + CLI)
  const clientResult = generateClientPackage(manifest, {
    appName,
    clientPackageName,
    version: options.version,
  })
  errors.push(...clientResult.errors)

  // Generate the server package (the contract, re-exported)
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
    ...(clientResult.diagnostics === undefined ? {} : { diagnostics: clientResult.diagnostics }),
  }
}
