/**
 * Server package generator.
 *
 * Generates an app's server package, `@macts/<app>-server`. The package is
 * contract-only: its single entry re-exports the app's generated contract
 * from `@macts/<app>/contract` as `contract`, and it depends on nothing but the
 * app package. A macts host serves the app from that contract and the app's
 * manifest, through its own HTTP and MCP adapters, so the package carries no
 * server or plugin code of its own.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../../manifest/index.js'
import { generationRefusals } from '../surface.js'
import { contractNames } from '../contract/index.js'
import { generateGitAttributes } from '../git-attributes.js'
import { MIT_LICENSE } from '../license.js'
import { GENERATED_PACKAGE_NODE_ENGINE } from '../package-conventions.js'

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
 * Generate a server package from a manifest.
 *
 * The package holds `src/index.ts`, which re-exports the app's contract as
 * `contract`, its package, TypeScript, build and ignore configuration, and a
 * `.gitattributes` marking the files it generates as generated.
 *
 * A manifest with a command that must select one item and declares no
 * identifier parameter is refused (`generationRefusals`), as it is for the
 * client package whose contract this one re-exports: the result holds the
 * errors naming each such command, and no files.
 *
 * @param manifest - The app manifest
 * @param options - Generation options
 * @returns Generated files and any errors
 */
export function generateServerPackage(
  manifest: AppManifest,
  options: GenerateServerPackageOptions
): GenerateServerPackageResult {
  const { serverPackageName, clientPackageName, version } = options
  const unscopedName = serverPackageName.replace(/^@[^/]+\//, '')
  const refusals = generationRefusals(manifest)
  if (refusals.length > 0) return { dir: unscopedName, files: [], errors: refusals }
  const capitalizedAppName = manifest.app.name.replace(/\s+/g, '')

  const files: { path: string; content: string }[] = [
    {
      path: 'src/index.ts',
      content: generateIndex(manifest, clientPackageName),
    },
    {
      path: 'package.json',
      content: generatePackageJson(
        serverPackageName,
        clientPackageName,
        capitalizedAppName,
        unscopedName,
        version
      ),
    },
    { path: 'tsconfig.json', content: TSCONFIG_JSON },
    { path: 'tsup.config.ts', content: TSUP_CONFIG },
    { path: '.gitignore', content: GITIGNORE },
    { path: 'LICENSE', content: MIT_LICENSE },
  ]
  // Last, so it marks every other file this package emits.
  files.push(generateGitAttributes(files))

  return { dir: unscopedName, files, errors: [] }
}

/** The package entry: the app's contract, re-exported as `contract`. */
function generateIndex(manifest: AppManifest, clientPackageName: string): string {
  const { contract } = contractNames(manifest)
  return `/**
 * The ${manifest.app.name} server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports \`${contract}\` from \`${clientPackageName}/contract\` as
 * \`contract\`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { ${contract} as contract } from '${clientPackageName}/contract'
`
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
  // tsup emits the entry's declarations beside it.
  const typesPath = './dist/index.d.ts'

  return JSON.stringify(
    {
      name: serverPackageName,
      version: versionStr,
      description: `Server package for macOS ${capitalizedAppName}.app: the contract a macts host serves`,
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'git+https://github.com/mike-north/macts.git',
        directory: `packages/${unscopedName}`,
      },
      keywords: ['macts-server'],
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
      publishConfig: { access: 'public' },
      engines: {
        node: GENERATED_PACKAGE_NODE_ENGINE,
      },
      scripts: {
        build: 'tsup',
        lint: 'eslint src',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      // The app package is the only dependency: the entry re-exports its
      // contract, and nothing else is imported.
      dependencies: {
        [clientPackageName]: 'workspace:*',
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
