import { Command, Option } from 'clipanion'
import { join, resolve } from 'node:path'
import {
  loadManifest,
  generateConsolidatedPackages,
  generateClientPackage,
  generateServerPackage,
  writeFiles,
} from '@macts/core'

/**
 * Command to generate packages from manifests.
 *
 * @example
 * ```bash
 * macts generate manifests/calendar/app.yaml --out-dir packages --target all
 * macts generate manifests/calendar/app.yaml --out-dir packages/calendar --target client
 * ```
 */
export class GenerateCommand extends Command {
  static override paths = [['generate']]

  static override usage = Command.Usage({
    description: 'Generate packages from a manifest',
    details: `
      This command generates TypeScript packages from a macts manifest file.

      With --target all (default), generates client and server packages into
      subdirectories of --out-dir (e.g., packages/calendar, packages/calendar-server).

      With --target client, generates a single client package (SDK + CLI) into --out-dir.

      With --target server, generates a single server package (API + MCP) into --out-dir.

      The manifest should be a YAML file following the macts manifest schema.
    `,
    examples: [
      [
        'Generate all packages for Reminders',
        '$0 generate manifests/reminders/app.yaml --out-dir packages --target all',
      ],
      [
        'Generate only client package',
        '$0 generate manifests/calendar/app.yaml --out-dir packages/calendar --target client',
      ],
      [
        'Generate only server package',
        '$0 generate manifests/calendar/app.yaml --out-dir packages/calendar-server --target server',
      ],
    ],
  })

  manifestPath = Option.String({ required: true })

  outDir = Option.String('--out-dir', {
    required: true,
    description: 'Output directory for generated packages',
  })

  target = Option.String('--target', 'all', {
    description: 'What to generate: all | client | server',
  })

  packageName = Option.String('--package-name', {
    required: false,
    description: 'npm package name (for single-target generation)',
  })

  version = Option.String('--version', {
    required: false,
    description: 'Package version (defaults to 0.0.0)',
  })

  async execute(): Promise<number> {
    try {
      const manifestPath = resolve(this.manifestPath)
      const outDir = resolve(this.outDir)
      const target = this.target

      this.context.stdout.write(`Loading manifest from ${manifestPath}...\n`)
      const manifest = await loadManifest(manifestPath)
      const appName = manifest.app.name.replace(/\s+/g, '-').toLowerCase()

      this.context.stdout.write(
        `Generating ${target} for ${manifest.app.name} (${manifest.app.bundleId})...\n`
      )

      if (target === 'client') {
        return await this.generateClient(manifest, appName, outDir)
      }

      if (target === 'server') {
        return await this.generateServer(manifest, appName, outDir)
      }

      // Default: generate all packages
      return await this.generateAll(manifest, appName, outDir)
    } catch (error) {
      if (error instanceof Error) {
        this.context.stderr.write(`Error: ${error.message}\n`)
        if (error.stack) {
          this.context.stderr.write(`\n${error.stack}\n`)
        }
      } else {
        this.context.stderr.write(`Unknown error: ${String(error)}\n`)
      }
      return 1
    }
  }

  private async generateAll(
    manifest: Parameters<typeof generateConsolidatedPackages>[0],
    appName: string,
    outDir: string
  ): Promise<number> {
    const result = generateConsolidatedPackages(manifest, {
      appName,
      version: this.version,
    })

    if (result.errors.length > 0) {
      this.context.stderr.write('Errors during generation:\n')
      for (const error of result.errors) {
        this.context.stderr.write(`  - ${error}\n`)
      }
      return 1
    }

    const totalFiles = result.client.files.length + result.server.files.length
    this.context.stdout.write(`Writing ${String(totalFiles)} files...\n`)

    await writeFiles(result.client.files, join(outDir, result.client.dir))
    await writeFiles(result.server.files, join(outDir, result.server.dir))

    this.context.stdout.write(`Generated packages:\n`)
    this.context.stdout.write(
      `  Client: ${join(outDir, result.client.dir)} (${String(result.client.files.length)} files)\n`
    )
    this.context.stdout.write(
      `  Server: ${join(outDir, result.server.dir)} (${String(result.server.files.length)} files)\n`
    )
    this.context.stdout.write(`\nNext steps:\n`)
    this.context.stdout.write(`  pnpm install\n`)
    this.context.stdout.write(`  pnpm build\n`)

    return 0
  }

  private async generateClient(
    manifest: Parameters<typeof generateClientPackage>[0],
    appName: string,
    outDir: string
  ): Promise<number> {
    const clientPackageName = this.packageName ?? `@macts/${appName}`

    const result = generateClientPackage(manifest, {
      appName,
      clientPackageName,
      version: this.version,
    })

    if (result.errors.length > 0) {
      this.context.stderr.write('Errors during generation:\n')
      for (const error of result.errors) {
        this.context.stderr.write(`  - ${error}\n`)
      }
      return 1
    }

    this.context.stdout.write(`Writing ${String(result.files.length)} files to ${outDir}...\n`)
    await writeFiles(result.files, outDir)

    this.context.stdout.write('Package generated successfully!\n')
    this.context.stdout.write(`\nNext steps:\n`)
    this.context.stdout.write(`  cd ${outDir}\n`)
    this.context.stdout.write(`  pnpm install\n`)
    this.context.stdout.write(`  pnpm build\n`)

    return 0
  }

  private async generateServer(
    manifest: Parameters<typeof generateServerPackage>[0],
    appName: string,
    outDir: string
  ): Promise<number> {
    const clientPackageName = `@macts/${appName}`
    const serverPackageName = this.packageName ?? `@macts/${appName}-server`

    const result = generateServerPackage(manifest, {
      appName,
      serverPackageName,
      clientPackageName,
      version: this.version,
    })

    if (result.errors.length > 0) {
      this.context.stderr.write('Errors during generation:\n')
      for (const error of result.errors) {
        this.context.stderr.write(`  - ${error}\n`)
      }
      return 1
    }

    this.context.stdout.write(`Writing ${String(result.files.length)} files to ${outDir}...\n`)
    await writeFiles(result.files, outDir)

    this.context.stdout.write('Package generated successfully!\n')
    this.context.stdout.write(`\nNext steps:\n`)
    this.context.stdout.write(`  cd ${outDir}\n`)
    this.context.stdout.write(`  pnpm install\n`)
    this.context.stdout.write(`  pnpm build\n`)

    return 0
  }
}
