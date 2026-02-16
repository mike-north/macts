import { readFile } from 'node:fs/promises';
import * as yaml from 'js-yaml';
import { AppManifestSchema, type AppManifest } from './schemas/index.js';

/**
 * Error thrown when manifest loading fails.
 */
export class ManifestLoadError extends Error {
  public readonly path: string;
  public readonly originalError?: unknown;

  constructor(message: string, path: string, originalError?: unknown) {
    super(message, { cause: originalError });
    this.name = 'ManifestLoadError';
    this.path = path;
    this.originalError = originalError;
  }
}

/**
 * Load and validate a manifest from a YAML file.
 *
 * @param manifestPath - Path to the app.yaml manifest file
 * @returns Parsed and validated AppManifest
 * @throws ManifestLoadError if loading or validation fails
 */
export async function loadManifest(manifestPath: string): Promise<AppManifest> {
  try {
    const content = await readFile(manifestPath, 'utf-8');
    const raw = yaml.load(content);

    // Validate against schema
    const result = AppManifestSchema.safeParse(raw);

    if (!result.success) {
      throw new ManifestLoadError(
        `Invalid manifest: ${result.error.message}`,
        manifestPath,
        result.error
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ManifestLoadError) {
      throw error;
    }
    throw new ManifestLoadError(
      `Failed to load manifest: ${error instanceof Error ? error.message : String(error)}`,
      manifestPath,
      error
    );
  }
}

/**
 * Load manifest from a YAML string (for testing).
 *
 * @param yamlContent - YAML content as string
 * @returns Parsed and validated AppManifest
 * @throws Error if parsing or validation fails
 */
export function parseManifestYaml(yamlContent: string): AppManifest {
  const raw = yaml.load(yamlContent);
  return AppManifestSchema.parse(raw);
}
