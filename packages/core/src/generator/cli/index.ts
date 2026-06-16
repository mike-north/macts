/**
 * CLI plugin generator.
 *
 * Generates Clipanion-based CLI plugins from macts manifests.
 *
 * @packageDocumentation
 */

import { join } from 'node:path'
import type { AppManifest } from '../../manifest/index.js'
import {
  createCliGeneratorContext,
  type CliGeneratorOptions,
  type CliGeneratorContext,
} from './context.js'
import {
  generateListCommand,
  generateCreateCommand,
  generateGetCommand,
  generateAppCommand,
  generateResourceCommand,
  type GeneratedCommand,
} from './commands.js'

export type { CliGeneratorOptions, CliGeneratorContext } from './context.js'
export type { GeneratedFlag } from './flags.js'
export type { GeneratedCommand } from './commands.js'

export interface GenerateCliPluginResult {
  files: { path: string; content: string }[]
  errors: string[]
}

/**
 * Generate a complete CLI plugin from a manifest.
 */
export function generateCliPlugin(
  manifest: AppManifest,
  options: CliGeneratorOptions
): GenerateCliPluginResult {
  const ctx = createCliGeneratorContext(manifest, options)
  const files: { path: string; content: string }[] = []
  const errors: string[] = []

  try {
    const commands: GeneratedCommand[] = []

    // Generate commands for each hierarchy path
    const standardOps = new Set(['list', 'get', 'create', 'update', 'delete'])
    for (const hierarchyPath of ctx.getHierarchyPaths()) {
      // Only emit a CRUD subcommand when the generated SDK actually exposes the
      // matching method — i.e. when the manifest declares a backing command for
      // that operation. The SDK keys each method's route by the command key, and
      // omits methods that have no backing command, so emitting a CLI command
      // that calls a non-existent SDK method would not type-check.
      const resourceCommands = ctx.getResourceCommands(hierarchyPath.resourceName)
      const hasOp = (op: string): boolean => resourceCommands.some((c) => c.name === op)

      // List command
      if (hasOp('list')) {
        commands.push(generateListCommand(hierarchyPath, ctx))
      }

      // Create command (only when a backing create command exists and the
      // resource is writable)
      if (hasOp('create')) {
        const createCmd = generateCreateCommand(hierarchyPath, ctx)
        if (createCmd) {
          commands.push(createCmd)
        }
      }

      // Get command
      if (hasOp('get')) {
        commands.push(generateGetCommand(hierarchyPath, ctx))
      }

      // Resource-level commands (like "show" for events)
      // Skip standard CRUD commands since they're already generated above
      for (const cmd of resourceCommands) {
        if (standardOps.has(cmd.name)) continue
        commands.push(generateResourceCommand(cmd, hierarchyPath, ctx))
      }
    }

    // Generate application-level commands
    for (const cmd of ctx.getAppCommands()) {
      commands.push(generateAppCommand(cmd, ctx))
    }

    // Add command files
    for (const command of commands) {
      files.push({
        path: join('src', 'commands', command.path),
        content: command.content,
      })
    }

    // Generate plugin.ts
    files.push({
      path: join('src', 'plugin.ts'),
      content: generatePluginFile(commands, ctx),
    })

    // Generate index.ts
    files.push({
      path: join('src', 'index.ts'),
      content: generateIndexFile(ctx),
    })

    // Generate sdk.ts (HTTP client singleton)
    files.push({
      path: join('src', 'sdk.ts'),
      content: generateSdkFile(ctx),
    })

    // Generate package.json
    files.push({
      path: 'package.json',
      content: generatePackageJson(ctx),
    })

    // Copy output formatters stub (they'll import from @macts/cli)
    files.push({
      path: join('src', 'output', 'index.ts'),
      content: generateOutputStub(),
    })

    // Generate boilerplate config files
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

    files.push({
      path: join('api-report', '.gitkeep'),
      content: '',
    })

    files.push({
      path: join('temp', '.gitkeep'),
      content: '',
    })
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { files, errors }
}

function generatePluginFile(commands: GeneratedCommand[], ctx: CliGeneratorContext): string {
  const imports: string[] = []
  const commandNames: string[] = []
  const seen = new Set<string>()

  for (const cmd of commands) {
    // Extract class name from file content
    const match = /export class (\w+Command)/.exec(cmd.content)
    if (match?.[1]) {
      const className = match[1]
      // Deduplicate commands with same class name
      if (seen.has(className)) continue
      seen.add(className)
      // cmd.path is relative to src/commands/, but plugin.ts is in src/
      const importPath = './commands/' + cmd.path.replace(/\.ts$/, '.js').replace(/\\/g, '/')
      imports.push(`import { ${className} } from '${importPath}';`)
      commandNames.push(className)
    }
  }

  return `import type { CliPlugin } from '@macts/cli';
${imports.join('\n')}

/**
 * CLI plugin for ${ctx.manifest.app.name}.
 */
export const plugin: CliPlugin = {
  name: '${ctx.getAppNameLower()}',
  description: 'Commands for ${ctx.manifest.app.name}',
  commands: [
    ${commandNames.join(',\n    ')},
  ],
};
`
}

function generateIndexFile(ctx: CliGeneratorContext): string {
  return `/**
 * CLI plugin for ${ctx.manifest.app.name}.
 *
 * @packageDocumentation
 */

export { plugin } from './plugin.js';
`
}

function generatePackageJson(ctx: CliGeneratorContext): string {
  const unscopedName = ctx.options.packageName.replace(/^@[^/]+\//, '')
  const typesPath = `./dist/${unscopedName}.d.ts`

  const pkg = {
    name: ctx.options.packageName,
    version: ctx.options.version ?? '0.0.0',
    description: `CLI plugin for macOS ${ctx.manifest.app.name}.app`,
    keywords: ['macts-cli-plugin'],
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
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      '@macts/cli': 'workspace:*',
      [ctx.options.sdkPackageName]: 'workspace:*',
      clipanion: '^4.0.0-rc.4',
      typanion: '^3.14.0',
    },
    devDependencies: {
      tsup: 'catalog:',
      typescript: 'catalog:',
    },
  }
  return JSON.stringify(pkg, null, 2)
}

function generateSdkFile(ctx: CliGeneratorContext): string {
  const appClassName = ctx.getAppClassName()
  const appNameLower = ctx.getAppNameLower()
  const sdkPackageName = ctx.options.sdkPackageName

  return `/**
 * SDK wrapper for the ${appClassName} HTTP client.
 *
 * @packageDocumentation
 */

import { ${appClassName}Client, type ${appClassName}ClientOptions } from '${sdkPackageName}';

/**
 * Get a ${appClassName}Client instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured ${appClassName}Client
 * @throws Error if MACTS_API_KEY is not set
 */
export function get${appClassName}Client(): ${appClassName}Client {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission ${appNameLower}:*:*'
    );
  }

  const options: ${appClassName}ClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new ${appClassName}Client(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: ${appClassName}Client | null = null;

/**
 * Get or create the singleton ${appClassName}Client.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): ${appClassName}Client {
  _client ??= get${appClassName}Client();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
`
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
  entry: ['src/index.ts'],
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

function generateOutputStub(): string {
  return `/**
 * Re-export output formatters from @macts/cli.
 */
export { createFormatter, JsonFormatter, HumanFormatter } from '@macts/cli';
export type { OutputFormatter, TableColumn, TableOptions } from '@macts/cli';
`
}
