/**
 * Server package generator.
 *
 * Generates consolidated server packages that combine an API plugin and an MCP
 * plugin into a single package with subpath exports.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../../manifest/index.js'
import { generateApiPlugin } from '../api/index.js'
import { generateMcpPlugin } from '../mcp/index.js'
import { createMcpGeneratorContext } from '../mcp/context.js'

/**
 * Options for generating a server package.
 */
export interface GenerateServerPackageOptions {
  /** App name (e.g., 'calendar') */
  appName: string
  /** Server package name (e.g., '\@macts/calendar-server') */
  serverPackageName: string
  /** Client package name (e.g., '\@macts/calendar') */
  clientPackageName: string
  /** Package version */
  version?: string | undefined
}

/**
 * Result of generating a server package.
 */
export interface GenerateServerPackageResult {
  /** Directory name for the package (e.g., 'calendar-server') */
  dir: string
  /** All generated files as path/content pairs */
  files: { path: string; content: string }[]
  /** Any errors encountered during generation */
  errors: string[]
}

/**
 * Config file paths that should be filtered out from sub-generator output.
 * These are replaced with unified config files for the server package.
 */
const CONFIG_FILE_PATHS = new Set([
  'package.json',
  'tsconfig.json',
  'tsup.config.ts',
  'vitest.config.ts',
  '.gitignore',
  'api-extractor.json',
  'api-report/.gitkeep',
  'temp/.gitkeep',
])

/**
 * Generate a consolidated server package from a manifest.
 *
 * Combines an API plugin (at `src/`) and an MCP plugin (at `src/mcp/`) into a
 * single package with subpath exports for `.` (API) and `./mcp` (MCP).
 *
 * @param manifest - The app manifest
 * @param options - Generation options
 * @returns Generated files and any errors
 */
export function generateServerPackage(
  manifest: AppManifest,
  options: GenerateServerPackageOptions
): GenerateServerPackageResult {
  const { appName, serverPackageName, clientPackageName, version } = options
  const files: { path: string; content: string }[] = []
  const errors: string[] = []

  try {
    // 1. Generate API plugin files
    const apiResult = generateApiPlugin(manifest, {
      packageName: serverPackageName,
      version,
    })
    errors.push(...apiResult.errors)

    // Keep only source files from the API generator (src/*), skip config files
    for (const file of apiResult.files) {
      if (!CONFIG_FILE_PATHS.has(file.path)) {
        files.push(file)
      }
    }

    // 2. Generate MCP plugin files
    // Pass the client package name as sdkPackageName so the generated sdk.ts
    // imports from '@macts/{app}' (the client) instead of '@macts/sdk-{app}'
    const mcpContext = createMcpGeneratorContext({
      appName,
      manifest,
      packageName: serverPackageName,
      sdkPackageName: clientPackageName,
      version,
    })
    const mcpResult = generateMcpPlugin(mcpContext)

    // Keep only source files from the MCP generator, prefix with 'mcp/'
    for (const file of mcpResult.files) {
      if (CONFIG_FILE_PATHS.has(file.path)) {
        continue
      }

      // Prefix all src/ files with mcp/ (e.g., src/tools/calendars.ts → src/mcp/tools/calendars.ts)
      if (file.path.startsWith('src/')) {
        const relativePath = file.path.slice('src/'.length)
        files.push({
          path: `src/mcp/${relativePath}`,
          content: file.content,
        })
      }
    }

    // 3. Generate unified config files
    const unscopedName = serverPackageName.replace(/^@[^/]+\//, '')
    const capitalizedAppName = manifest.app.name.replace(/\s+/g, '')

    files.push({
      path: 'package.json',
      content: generatePackageJson(
        serverPackageName,
        clientPackageName,
        capitalizedAppName,
        unscopedName,
        version
      ),
    })

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
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  const dir = serverPackageName.replace(/^@[^/]+\//, '')

  return { dir, files, errors }
}

/**
 * Generate the package.json file for the server package.
 */
function generatePackageJson(
  serverPackageName: string,
  clientPackageName: string,
  capitalizedAppName: string,
  unscopedName: string,
  version: string | undefined
): string {
  const versionStr = version ?? '0.0.0'
  const typesPath = `./dist/${unscopedName}.d.ts`

  return JSON.stringify(
    {
      name: serverPackageName,
      version: versionStr,
      description: `Server package for macOS ${capitalizedAppName}.app (API + MCP)`,
      keywords: ['macts-server'],
      type: 'module',
      exports: {
        '.': {
          types: typesPath,
          import: './dist/index.js',
        },
        './mcp': {
          types: './dist/mcp.d.ts',
          import: './dist/mcp/index.js',
        },
      },
      main: './dist/index.js',
      types: typesPath,
      files: ['dist'],
      engines: {
        node: '>=22',
      },
      scripts: {
        build: 'tsup',
        lint: 'eslint src',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@macts/api': 'workspace:*',
        '@macts/core': 'workspace:*',
        [clientPackageName]: 'workspace:*',
      },
      peerDependencies: {
        '@macts/mcp': 'workspace:*',
      },
      peerDependenciesMeta: {
        '@macts/mcp': {
          optional: true,
        },
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
  entry: {
    index: 'src/index.ts',
    'mcp/index': 'src/mcp/index.ts',
  },
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
