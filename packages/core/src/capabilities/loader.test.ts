/**
 * Integration tests for loading a capability registry from a manifests
 * directory. Exercises the real filesystem + manifest loader (no mocks).
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadCapabilityRegistry, loadManifestsFromDir } from './loader.js'
import { NOTEBOOK_MANIFEST_YAML } from './test-fixtures.js'

describe('loadManifestsFromDir / loadCapabilityRegistry', () => {
  let dir: string

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-capreg-'))
    // Two apps: a valid Notebook manifest and a directory with no manifest.
    await mkdir(join(dir, 'notebook'), { recursive: true })
    await writeFile(join(dir, 'notebook', 'app.yaml'), NOTEBOOK_MANIFEST_YAML, 'utf-8')
    // A directory without an app.yaml — must be skipped, not error.
    await mkdir(join(dir, 'empty-app'), { recursive: true })
    // A directory with a malformed manifest — must be reported as an error.
    await mkdir(join(dir, 'broken'), { recursive: true })
    await writeFile(join(dir, 'broken', 'app.yaml'), 'version: "1.0"\nnot: valid\n', 'utf-8')
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('loads valid manifests and skips directories without a manifest', async () => {
    const { manifests, errors } = await loadManifestsFromDir(dir)
    expect(manifests.map((m) => m.app.name)).toContain('Notebook')
    // empty-app produced no manifest and no error (ENOENT is silently skipped).
    expect(errors.some((e) => e.app === 'empty-app')).toBe(false)
  })

  it('reports malformed manifests as errors without aborting the load', async () => {
    const { manifests, errors } = await loadManifestsFromDir(dir)
    expect(errors.some((e) => e.app === 'broken')).toBe(true)
    // The valid Notebook manifest still loaded despite the broken sibling.
    expect(manifests.some((m) => m.app.name === 'Notebook')).toBe(true)
  })

  it('builds a registry whose capabilities come from the loaded manifests', async () => {
    const { registry } = await loadCapabilityRegistry(dir)
    expect(registry.get('notebook.notes.create')?.risk).toBe('write')
    expect(registry.names).toContain('notebook.app.doScript')
  })

  it('returns an error entry for a non-existent manifests directory', async () => {
    const { manifests, errors } = await loadManifestsFromDir(join(dir, 'does-not-exist'))
    expect(manifests).toHaveLength(0)
    expect(errors).toHaveLength(1)
  })
})
