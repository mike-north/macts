/**
 * Consolidated client package generator for macts.
 *
 * Generates a single package that combines the HTTP client SDK and CLI plugin
 * into one published package, `@macts/<app>`, rather than separate per-surface
 * packages.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../../manifest/index.js'
import { generateHttpClientSdk } from '../sdk/http-client.js'
import { generateCliPlugin } from '../cli/index.js'

/**
 * Options for client package generation.
 */
export interface GenerateClientPackageOptions {
  /** App name (e.g., "calendar") */
  appName: string
  /** Client package name (e.g., "@macts/calendar") */
  clientPackageName: string
  /** Package version */
  version?: string | undefined
}

/**
 * Result of client package generation.
 */
export interface GenerateClientPackageResult {
  /** Output directory name (e.g., "calendar") */
  dir: string
  /** Generated files with relative paths */
  files: { path: string; content: string }[]
  /** Any errors encountered during generation */
  errors: string[]
}

/**
 * Config file paths that should be filtered out from the SDK and CLI generators,
 * since we generate unified versions of these.
 */
const CONFIG_FILE_PATHS = new Set([
  'package.json',
  'tsconfig.json',
  'tsup.config.ts',
  '.gitignore',
  'api-extractor.json',
  'api-report/.gitkeep',
  'temp/.gitkeep',
])

/**
 * Generate a consolidated client package from a manifest.
 *
 * Combines the HTTP client SDK and CLI plugin into a single package with:
 * - SDK source files at `src/` root (client.ts, types.ts, resources/, index.ts)
 * - CLI source files under `src/cli/` (commands/, plugin.ts, index.ts, output/, sdk.ts)
 * - Unified config files (package.json, tsconfig, tsup, api-extractor)
 *
 * @param manifest - The app manifest
 * @param options - Generation options
 * @returns Generated files for the consolidated package
 */
export function generateClientPackage(
  manifest: AppManifest,
  options: GenerateClientPackageOptions
): GenerateClientPackageResult {
  const files: { path: string; content: string }[] = []
  const errors: string[] = []

  const appName = options.appName.replace(/\s+/g, '-').toLowerCase()

  // Synthetic SDK package name used internally for the CLI generator context.
  // The CLI generator uses this to generate the sdk.ts import, which we then
  // transform to a relative import. It never appears in the emitted output:
  // the unified package.json (using the real @macts/<app> name) replaces the
  // SDK and CLI generators' package.json, and the sdk.ts import is rewritten to
  // a relative path below.
  const syntheticSdkPackageName = `@macts/${appName}-sdk-internal`

  // --- Generate SDK files ---
  const sdkResult = generateHttpClientSdk(manifest, {
    packageName: syntheticSdkPackageName,
    version: options.version,
  })
  errors.push(...sdkResult.errors)

  // Keep only source files from the SDK (those starting with "src/")
  for (const file of sdkResult.files) {
    if (!CONFIG_FILE_PATHS.has(file.path)) {
      files.push(file)
    }
  }

  // --- Generate CLI files ---
  // The CLI generator's package.json is filtered out and replaced by the unified
  // one below, so the package name passed here is internal-only. Use the real
  // consolidated client package name (@macts/<app>) rather than a phantom name.
  const cliResult = generateCliPlugin(manifest, {
    packageName: options.clientPackageName,
    sdkPackageName: syntheticSdkPackageName,
    version: options.version,
  })
  errors.push(...cliResult.errors)

  // Keep only source files from the CLI, prefixed under "src/cli/"
  for (const file of cliResult.files) {
    if (CONFIG_FILE_PATHS.has(file.path)) {
      continue
    }

    // All CLI source files start with "src/" — remap to "src/cli/"
    if (file.path.startsWith('src/')) {
      const relativePath = file.path.slice('src/'.length) // e.g., "commands/foo.ts", "plugin.ts", "index.ts"
      const newPath = `src/cli/${relativePath}`

      // Transform sdk.ts to use a relative import instead of the external SDK package
      if (relativePath === 'sdk.ts') {
        files.push({
          path: newPath,
          content: file.content.replace(`from '${syntheticSdkPackageName}'`, `from '../client.js'`),
        })
      } else {
        files.push({ path: newPath, content: file.content })
      }
    }
  }

  // --- Generate unified config files ---
  const unscopedName = options.clientPackageName.replace(/^@[^/]+\//, '')

  files.push({
    path: 'package.json',
    content: generatePackageJson(options.clientPackageName, unscopedName, appName, options.version),
  })

  files.push({
    path: 'tsconfig.json',
    content: generateTsconfig(),
  })

  files.push({
    path: 'tsup.config.ts',
    content: generateTsupConfig(),
  })

  files.push({
    path: '.gitignore',
    content: generateGitignore(),
  })

  files.push({
    path: 'api-extractor.json',
    content: generateApiExtractorConfig(),
  })

  files.push({ path: 'api-report/.gitkeep', content: '' })

  return {
    dir: appName,
    files,
    errors,
  }
}

function generatePackageJson(
  packageName: string,
  unscopedName: string,
  appName: string,
  version: string | undefined
): string {
  const pkg = {
    name: packageName,
    version: version ?? '0.0.0',
    description: `SDK and CLI for macOS ${appName} automation`,
    license: 'MIT',
    type: 'module',
    exports: {
      '.': {
        types: `./dist/${unscopedName}.d.ts`,
        import: './dist/index.js',
      },
      './cli': {
        types: './dist/cli.d.ts',
        import: './dist/cli/index.js',
      },
    },
    main: './dist/index.js',
    types: `./dist/${unscopedName}.d.ts`,
    files: ['dist'],
    keywords: ['macts-sdk', 'macts-cli-plugin'],
    scripts: {
      build: 'tsup',
      'api-extractor': 'api-extractor run --local',
      'api-extractor:ci': 'api-extractor run',
      lint: 'eslint src',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      zod: '^4.3.6',
    },
    peerDependencies: {
      '@macts/cli': '*',
      clipanion: '^4.0.0-rc.4',
      typanion: '^3.14.0',
    },
    peerDependenciesMeta: {
      '@macts/cli': { optional: true },
      clipanion: { optional: true },
      typanion: { optional: true },
    },
    devDependencies: {
      '@macts/cli': 'workspace:*',
      clipanion: '^4.0.0-rc.4',
      tsup: 'catalog:',
      typanion: '^3.14.0',
      typescript: 'catalog:',
      vitest: 'catalog:',
    },
  }
  return JSON.stringify(pkg, null, 2)
}

function generateTsconfig(): string {
  return JSON.stringify(
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
}

function generateTsupConfig(): string {
  return `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
`
}

function generateGitignore(): string {
  return `dist/
node_modules/
*.tsbuildinfo
.turbo/
`
}

function generateApiExtractorConfig(): string {
  return JSON.stringify(
    {
      $schema:
        'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
      extends: '../../api-extractor.base.json',
    },
    null,
    2
  )
}
