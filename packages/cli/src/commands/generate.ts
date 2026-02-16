import { Command, Option } from 'clipanion';
import { resolve } from 'node:path';
import { loadManifest, generateSdk, writeSdk } from '@macts/core';

/**
 * Command to generate SDK packages from manifests.
 *
 * @example
 * ```bash
 * macts generate manifests/calendar/app.yaml --out-dir packages/sdk-calendar --package-name @macts/sdk-calendar
 * ```
 */
export class GenerateCommand extends Command {
  static override paths = [['generate']];

  static override usage = Command.Usage({
    description: 'Generate an SDK package from a manifest',
    details: `
      This command generates a complete TypeScript SDK package from a macts manifest file.
      The generated package includes:
      - TypeScript types for all resources
      - Zod schemas for runtime validation
      - Resource and collection classes
      - Application class

      The manifest should be a YAML file following the macts manifest schema.
    `,
    examples: [
      [
        'Generate SDK for Calendar app',
        '$0 generate manifests/calendar/app.yaml --out-dir packages/sdk-calendar --package-name @macts/sdk-calendar',
      ],
      [
        'Generate SDK with custom version',
        '$0 generate manifests/calendar/app.yaml --out-dir packages/sdk-calendar --package-name @macts/sdk-calendar --version 1.0.0',
      ],
    ],
  });

  manifestPath = Option.String({ required: true });

  outDir = Option.String('--out-dir', {
    required: true,
    description: 'Output directory for generated SDK package',
  });

  packageName = Option.String('--package-name', {
    required: true,
    description: 'npm package name (e.g., @macts/sdk-calendar)',
  });

  version = Option.String('--version', {
    required: false,
    description: 'Package version (defaults to 0.0.0)',
  });

  async execute(): Promise<number> {
    try {
      // Resolve paths
      const manifestPath = resolve(this.manifestPath);
      const outDir = resolve(this.outDir);

      this.context.stdout.write(`Loading manifest from ${manifestPath}...\n`);

      // Load and validate manifest
      const manifest = await loadManifest(manifestPath);

      this.context.stdout.write(
        `Generating SDK for ${manifest.app.name} (${manifest.app.bundleId})...\n`
      );

      // Generate SDK
      const result = generateSdk(manifest, {
        outDir,
        packageName: this.packageName,
        version: this.version,
      });

      // Check for errors
      if (result.errors.length > 0) {
        this.context.stderr.write('Errors during generation:\n');
        for (const error of result.errors) {
          this.context.stderr.write(`  - ${error}\n`);
        }
        return 1;
      }

      // Write files to disk
      this.context.stdout.write(`Writing ${String(result.files.length)} files to ${outDir}...\n`);
      await writeSdk(result, outDir);

      this.context.stdout.write('SDK generated successfully!\n');
      this.context.stdout.write(`\nNext steps:\n`);
      this.context.stdout.write(`  cd ${outDir}\n`);
      this.context.stdout.write(`  pnpm install\n`);
      this.context.stdout.write(`  pnpm build\n`);

      return 0;
    } catch (error) {
      if (error instanceof Error) {
        this.context.stderr.write(`Error: ${error.message}\n`);
        if (error.stack) {
          this.context.stderr.write(`\n${error.stack}\n`);
        }
      } else {
        this.context.stderr.write(`Unknown error: ${String(error)}\n`);
      }
      return 1;
    }
  }
}
