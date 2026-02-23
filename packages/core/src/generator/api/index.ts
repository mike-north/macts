/**
 * API plugin generator.
 *
 * Generates API plugins that package up manifests for the @macts/api server.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../../manifest/index.js'

/**
 * Options for generating an API plugin.
 */
export interface ApiPluginGeneratorOptions {
  /** Package name (e.g., '@macts/api-calendar') */
  packageName: string
  /** Package version */
  version?: string | undefined
}

/**
 * Result of generating an API plugin.
 */
export interface GenerateApiPluginResult {
  files: { path: string; content: string }[]
  errors: string[]
}

/**
 * Generate an API plugin from a manifest.
 *
 * The API plugin packages up the app manifest and metadata so the core API
 * server can load it and auto-generate RPC endpoints.
 *
 * @param manifest - The app manifest
 * @param options - Generation options
 * @returns Generated files and any errors
 */
export function generateApiPlugin(
  manifest: AppManifest,
  options: ApiPluginGeneratorOptions
): GenerateApiPluginResult {
  const files: { path: string; content: string }[] = []
  const errors: string[] = []

  try {
    const appName = manifest.app.name.replace(/\s+/g, '').toLowerCase()
    const capitalizedAppName = manifest.app.name.replace(/\s+/g, '')
    const bundleId = manifest.app.bundleId

    // Generate plugin.ts
    files.push({
      path: 'src/plugin.ts',
      content: generatePluginFile(manifest, appName, capitalizedAppName, bundleId),
    })

    // Generate index.ts
    files.push({
      path: 'src/index.ts',
      content: generateIndexFile(appName, capitalizedAppName),
    })

    // Generate package.json
    files.push({
      path: 'package.json',
      content: generatePackageJson(options.packageName, capitalizedAppName, options.version),
    })

    // Generate boilerplate config files
    files.push({
      path: 'tsconfig.json',
      content: TSCONFIG_JSON,
    })

    files.push({
      path: 'tsup.config.ts',
      content: TSUP_CONFIG,
    })

    files.push({
      path: '.gitignore',
      content: GITIGNORE,
    })

    files.push({
      path: 'api-extractor.json',
      content: API_EXTRACTOR_JSON,
    })

    files.push({
      path: 'api-report/.gitkeep',
      content: '',
    })

    files.push({
      path: 'temp/.gitkeep',
      content: '',
    })
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { files, errors }
}

/**
 * Generate the plugin.ts file with the embedded manifest.
 */
function generatePluginFile(
  manifest: AppManifest,
  appName: string,
  capitalizedAppName: string,
  bundleId: string
): string {
  const camelCaseAppName = appName.charAt(0).toLowerCase() + capitalizedAppName.slice(1)
  const manifestJson = JSON.stringify(manifest, null, 2)

  return `/**
 * API plugin for ${capitalizedAppName}.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for ${capitalizedAppName}.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for ${capitalizedAppName}.app automation.
 */
export const ${camelCaseAppName}ApiPlugin = {
  name: '${appName}',
  bundleId: '${bundleId}',
  manifest: ${manifestJson} as AppManifest,
} as const;
`
}

/**
 * Generate the index.ts file.
 */
function generateIndexFile(_appName: string, capitalizedAppName: string): string {
  const camelCaseAppName = capitalizedAppName.charAt(0).toLowerCase() + capitalizedAppName.slice(1)

  return `/**
 * API plugin for macOS ${capitalizedAppName}.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { ${camelCaseAppName}ApiPlugin as plugin, ${camelCaseAppName}ApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
`
}

/**
 * Generate the package.json file.
 */
function generatePackageJson(
  packageName: string,
  capitalizedAppName: string,
  version: string | undefined
): string {
  const versionStr = version ?? '0.0.0'
  const unscopedName = packageName.replace(/^@[^/]+\//, '')
  const typesPath = `./dist/${unscopedName}.d.ts`

  return JSON.stringify(
    {
      name: packageName,
      version: versionStr,
      description: `API plugin for macOS ${capitalizedAppName}.app`,
      keywords: ['macts-api-plugin'],
      type: 'module',
      exports: {
        '.': {
          types: typesPath,
          import: './dist/index.js',
        },
      },
      main: './dist/index.js',
      types: typesPath,
      files: ['dist'],
      scripts: {
        build: 'tsup',
        'api-extractor': 'api-extractor run --local',
        'api-extractor:ci': 'api-extractor run',
        lint: 'eslint src',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@macts/api': 'workspace:*',
        '@macts/core': 'workspace:*',
      },
      devDependencies: {
        tsup: 'catalog:',
        vitest: 'catalog:',
        typescript: 'catalog:',
      },
    },
    null,
    2
  )
}

// Boilerplate configuration files
const TSCONFIG_JSON = JSON.stringify(
  {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      rootDir: 'src',
      outDir: 'dist',
    },
    include: ['src'],
  },
  null,
  2
)

const TSUP_CONFIG = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
`

const GITIGNORE = `dist/
node_modules/
*.tsbuildinfo
.turbo/
`

const API_EXTRACTOR_JSON = JSON.stringify(
  {
    $schema:
      'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
    extends: '../../api-extractor.base.json',
  },
  null,
  2
)
