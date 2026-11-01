import { Command, Option } from 'clipanion'
import { join, resolve } from 'node:path'
import {
  loadManifest,
  generateConsolidatedPackages,
  generateClientPackage,
  generateServerPackage,
  writeGeneratedPackage,
  type GeneratedPackageWriteResult,
} from '@macts/core'

/**
 * The prefix of each generation diagnostic line on stderr. Diagnostics are
 * tolerated fallbacks (a manifest type the contract describes as `unknown`),
 * not errors, so they never change the exit status. `scripts/regenerate.mjs`
 * counts lines with this prefix.
 */
export const GENERATION_WARNING_PREFIX = 'warning: '

/**
 * The prefixes of the stdout lines that report how a package's owned output
 * changed: a file the run deleted because it no longer emits it, and a package
 * whose previous owned-output set came from generated headers because it had
 * no record yet. `scripts/regenerate.mjs` passes these lines through.
 */
export const PRUNED_FILE_PREFIX = 'pruned '
export const BOOTSTRAP_REPORT_PREFIX = 'bootstrapped owned-output set from headers: '

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

      Each generated package records the files the run emitted in its
      .macts-generated.json. A file an earlier run emitted that this run no
      longer emits is deleted, and reported on stdout. Files the generator
      never emitted, such as a changelog or handwritten tests, are kept.

      With --target all (default), generates client and server packages into
      subdirectories of --out-dir (e.g., packages/calendar, packages/calendar-server).

      With --target client, generates a single client package (SDK + CLI) into --out-dir.

      With --target server, generates a single server package (API + MCP) into --out-dir.

      The manifest should be a YAML file following the macts manifest schema.

      Manifest types the generated contract cannot resolve are described as
      unknown and reported on stderr as warnings; they do not fail generation.
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
    this.reportDiagnostics(result.diagnostics)

    if (result.errors.length > 0) {
      this.context.stderr.write('Errors during generation:\n')
      for (const error of result.errors) {
        this.context.stderr.write(`  - ${error}\n`)
      }
      return 1
    }

    const totalFiles = result.client.files.length + result.server.files.length
    this.context.stdout.write(`Writing ${String(totalFiles)} files...\n`)

    const clientDir = join(outDir, result.client.dir)
    const serverDir = join(outDir, result.server.dir)
    this.reportOwnedOutput(clientDir, await writeGeneratedPackage(result.client.files, clientDir))
    this.reportOwnedOutput(serverDir, await writeGeneratedPackage(result.server.files, serverDir))

    this.context.stdout.write(`Generated packages:\n`)
    this.context.stdout.write(
      `  Client: ${clientDir} (${String(result.client.files.length)} files)\n`
    )
    this.context.stdout.write(
      `  Server: ${serverDir} (${String(result.server.files.length)} files)\n`
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
    this.reportDiagnostics(result.diagnostics)

    if (result.errors.length > 0) {
      this.context.stderr.write('Errors during generation:\n')
      for (const error of result.errors) {
        this.context.stderr.write(`  - ${error}\n`)
      }
      return 1
    }

    this.context.stdout.write(`Writing ${String(result.files.length)} files to ${outDir}...\n`)
    this.reportOwnedOutput(outDir, await writeGeneratedPackage(result.files, outDir))

    this.context.stdout.write('Package generated successfully!\n')
    this.context.stdout.write(`\nNext steps:\n`)
    this.context.stdout.write(`  cd ${outDir}\n`)
    this.context.stdout.write(`  pnpm install\n`)
    this.context.stdout.write(`  pnpm build\n`)

    return 0
  }

  /**
   * Report how writing one package changed its owned output: one line per
   * file pruned, and one line when the previous set came from generated
   * headers because the package had no record yet.
   */
  private reportOwnedOutput(packageDir: string, result: GeneratedPackageWriteResult): void {
    if (result.previousSource === 'headers') {
      this.context.stdout.write(
        `${BOOTSTRAP_REPORT_PREFIX}${String(result.previous.length)} files in ${packageDir}\n`
      )
    }
    for (const path of result.pruned) {
      this.context.stdout.write(`${PRUNED_FILE_PREFIX}${join(packageDir, path)}\n`)
    }
  }

  /**
   * Report each generation diagnostic on stderr as one warning line. Each
   * diagnostic names the app, the manifest position, and the declared type.
   * The server package carries no contract, so it has none.
   */
  private reportDiagnostics(diagnostics: readonly string[] | undefined): void {
    for (const diagnostic of diagnostics ?? []) {
      this.context.stderr.write(`${GENERATION_WARNING_PREFIX}${diagnostic}\n`)
    }
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
    this.reportOwnedOutput(outDir, await writeGeneratedPackage(result.files, outDir))

    this.context.stdout.write('Package generated successfully!\n')
    this.context.stdout.write(`\nNext steps:\n`)
    this.context.stdout.write(`  cd ${outDir}\n`)
    this.context.stdout.write(`  pnpm install\n`)
    this.context.stdout.write(`  pnpm build\n`)

    return 0
  }
}
