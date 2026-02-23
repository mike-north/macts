/**
 * File writer utility for generated packages.
 *
 * @packageDocumentation
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'

/**
 * Write generated files to disk.
 *
 * Creates directories as needed and writes each file's content.
 *
 * @param files - Array of path/content pairs
 * @param outDir - Base output directory
 */
export async function writeFiles(
  files: { path: string; content: string }[],
  outDir: string
): Promise<void> {
  for (const file of files) {
    const fullPath = join(outDir, file.path)
    const dir = dirname(fullPath)
    await mkdir(dir, { recursive: true })
    await writeFile(fullPath, file.content, 'utf-8')
  }
}
