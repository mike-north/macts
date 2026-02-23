import { readFile, readdir, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'

export interface ExtractResult {
  sdefPath: string
  sdefContent: string
  appPath: string
  bundleId?: string
}

export class SdefExtractError extends Error {
  constructor(
    message: string,
    public readonly appName: string,
    cause?: unknown
  ) {
    super(message, { cause })
    this.name = 'SdefExtractError'
  }
}

/**
 * Find an application by name and extract its SDEF.
 */
export async function extractSdef(appName: string): Promise<ExtractResult> {
  // 1. Find the app bundle
  const appPath = await findAppBundle(appName)

  // 2. Look for .sdef in Contents/Resources
  const resourcesPath = join(appPath, 'Contents', 'Resources')
  const sdefPath = await findSdefFile(resourcesPath)

  // 3. Read the SDEF content
  const sdefContent = await readFile(sdefPath, 'utf-8')

  // 4. Try to get bundle ID from Info.plist
  const bundleId = await getBundleId(appPath)

  const result: ExtractResult = {
    sdefPath,
    sdefContent,
    appPath,
  }

  if (bundleId !== undefined) {
    result.bundleId = bundleId
  }

  return result
}

/**
 * Find app bundle in standard locations.
 */
export async function findAppBundle(appName: string): Promise<string> {
  // Normalize app name (add .app if needed)
  const appFileName = appName.endsWith('.app') ? appName : `${appName}.app`

  // Standard search paths
  const searchPaths = [
    '/Applications',
    '/System/Applications',
    '/System/Applications/Utilities',
    '/System/Library/CoreServices',
    join(process.env['HOME'] ?? '', 'Applications'),
  ]

  for (const basePath of searchPaths) {
    const appPath = join(basePath, appFileName)
    try {
      const stats = await stat(appPath)
      if (stats.isDirectory()) {
        return appPath
      }
    } catch {
      // Not found in this location, continue
    }
  }

  throw new SdefExtractError(`Application "${appName}" not found in standard locations`, appName)
}

/**
 * Find .sdef file in Resources directory.
 */
async function findSdefFile(resourcesPath: string): Promise<string> {
  try {
    const files = await readdir(resourcesPath)
    const sdefFiles = files.filter((f) => extname(f).toLowerCase() === '.sdef')

    const firstSdef = sdefFiles[0]
    if (!firstSdef) {
      throw new SdefExtractError('No .sdef file found in app bundle', resourcesPath)
    }

    // Return first .sdef file found
    return join(resourcesPath, firstSdef)
  } catch (error) {
    if (error instanceof SdefExtractError) throw error
    throw new SdefExtractError(
      `Cannot access Resources directory: ${resourcesPath}`,
      resourcesPath,
      error
    )
  }
}

/**
 * Extract bundle ID from Info.plist.
 */
async function getBundleId(appPath: string): Promise<string | undefined> {
  const plistPath = join(appPath, 'Contents', 'Info.plist')
  try {
    const content = await readFile(plistPath, 'utf-8')
    // Simple regex to extract CFBundleIdentifier
    const regex = /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/
    const match = regex.exec(content)
    return match?.[1]
  } catch {
    return undefined
  }
}

/**
 * List all apps with SDEF files.
 */
export async function listScriptableApps(): Promise<{ name: string; path: string }[]> {
  const apps: { name: string; path: string }[] = []

  const searchPaths = ['/Applications', '/System/Applications']

  for (const basePath of searchPaths) {
    try {
      const entries = await readdir(basePath)
      for (const entry of entries) {
        if (entry.endsWith('.app')) {
          const appPath = join(basePath, entry)
          const resourcesPath = join(appPath, 'Contents', 'Resources')
          try {
            const files = await readdir(resourcesPath)
            if (files.some((f) => extname(f).toLowerCase() === '.sdef')) {
              apps.push({
                name: basename(entry, '.app'),
                path: appPath,
              })
            }
          } catch {
            // Can't access resources, skip
          }
        }
      }
    } catch {
      // Can't access search path, skip
    }
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name))
}
