/**
 * Integration tests: the real generator's emit-plus-prune step over a
 * temporary `packages/` directory.
 *
 * The Screen Sharing and Automator packages are generated from their real
 * manifests and written with `writeGeneratedPackage`, the step `macts
 * generate` runs. Each case then plants what an earlier run would have left
 * behind and regenerates, comparing the tree with a fresh generate into an
 * empty directory.
 *
 * The regression fixture is the six files #179 reports: Screen Sharing's
 * `Connection` resource and Automator's `getSetting` and `getRequiredResource`
 * commands were marked unsupported, after which no generator run emits them,
 * yet regenerating left them on disk. A generator that only writes files fails
 * this test.
 *
 * @see https://github.com/mike-north/macts/issues/179
 * @see ./owned-output.ts (the ownership rule)
 */

import { mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { AppManifest } from '../manifest/index.js'
import { loadManifest } from '../manifest/loader.js'
import { generateConsolidatedPackages } from './orchestrate.js'
import {
  OWNED_OUTPUT_RECORD_FILE,
  parseOwnedOutputRecord,
  renderOwnedOutputRecord,
  writeGeneratedPackage,
} from './owned-output.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/**
 * The six files #179 found after regenerating, each with the leading lines it
 * had when it was last generated. Only `connection.ts` opens with a generated
 * header.
 */
const ISSUE_179_STALE_FILES: Record<string, string> = {
  'screen-sharing/src/cli/commands/connections/list.ts': `import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List connections.
 */
`,
  'screen-sharing/src/cli/commands/connections/get.ts': `import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a connection by ID.
 */
`,
  'screen-sharing/src/resources/connection.ts': `/**
 * Connection client for Screen Sharing SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
`,
  'screen-sharing-server/src/mcp/tools/connections.ts': `/**
 * MCP tools for Screen-sharing.app connections operations.
 *
 * @packageDocumentation
 */
`,
  'automator/src/cli/commands/workflows/actions/settings/get.ts': `import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Get a setting by ID.
 */
`,
  'automator/src/cli/commands/workflows/actions/requiredResources/get.ts': `import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Get a required resource by ID.
 */
`,
}

/** One generated package: its directory under `packages/` and its files. */
interface GeneratedPackage {
  readonly dir: string
  readonly files: { path: string; content: string }[]
}

let generated: GeneratedPackage[]

beforeAll(async () => {
  generated = []
  for (const app of ['automator', 'screen-sharing']) {
    const manifest: AppManifest = await loadManifest(join(MANIFESTS_DIR, app, 'app.yaml'))
    const result = generateConsolidatedPackages(manifest, { appName: app })
    expect(result.errors).toEqual([])
    generated.push(result.client, result.server)
  }
})

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'macts-owned-output-packages-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

/** Write every generated package under a `packages/` directory, as `macts generate` does. */
async function generateInto(packagesDir: string): Promise<void> {
  for (const pkg of generated) {
    await writeGeneratedPackage(pkg.files, join(packagesDir, pkg.dir))
  }
}

/** Write files under a `packages/` directory, creating parents. */
async function plant(packagesDir: string, files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(packagesDir, path)), { recursive: true })
    await writeFile(join(packagesDir, path), content, 'utf-8')
  }
}

/** Every file under a directory, relative to it, sorted. */
async function tree(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1))
    .sort()
}

/** Add paths to a package's record, as if the previous run had emitted them. */
async function recordAsPreviouslyEmitted(packagesDir: string, paths: string[]): Promise<void> {
  for (const path of paths) {
    const [pkg, ...rest] = path.split('/')
    if (pkg === undefined) throw new Error(`No package in ${path}`)
    const recordPath = join(packagesDir, pkg, OWNED_OUTPUT_RECORD_FILE)
    const recorded = parseOwnedOutputRecord(await readFile(recordPath, 'utf-8'), recordPath)
    await writeFile(recordPath, renderOwnedOutputRecord([...recorded, rest.join('/')]), 'utf-8')
  }
}

describe('regenerating the real Screen Sharing and Automator packages', () => {
  it('no longer emits any of the six files #179 reports', () => {
    const emitted = new Set(
      generated.flatMap((pkg) => pkg.files.map((file) => `${pkg.dir}/${file.path}`))
    )
    for (const path of Object.keys(ISSUE_179_STALE_FILES)) {
      expect(emitted.has(path)).toBe(false)
    }
  })

  it('records exactly what it emitted in each package', async () => {
    await generateInto(root)
    for (const pkg of generated) {
      const recordPath = join(root, pkg.dir, OWNED_OUTPUT_RECORD_FILE)
      const recorded = parseOwnedOutputRecord(await readFile(recordPath, 'utf-8'), recordPath)
      expect(recorded).toEqual([...new Set(pkg.files.map((file) => file.path))].sort())
    }
  })

  it('prunes the six files #179 reports when the record holds them (regression for #179)', async () => {
    const fresh = join(root, 'fresh')
    await generateInto(fresh)

    const regenerated = join(root, 'regenerated')
    await generateInto(regenerated)
    await plant(regenerated, ISSUE_179_STALE_FILES)
    await recordAsPreviouslyEmitted(regenerated, Object.keys(ISSUE_179_STALE_FILES))

    await generateInto(regenerated)

    const files = await tree(regenerated)
    for (const path of Object.keys(ISSUE_179_STALE_FILES)) {
      expect(files).not.toContain(path)
    }
    // The `connections` command directory held only pruned files, so it goes
    // too; Automator's `settings` directory keeps its still-emitted `list.ts`.
    await expect(
      readdir(join(regenerated, 'screen-sharing/src/cli/commands/connections'))
    ).rejects.toThrow()
    expect(files).toContain('automator/src/cli/commands/workflows/actions/settings/list.ts')
    expect(files).toEqual(await tree(fresh))
  })

  it('keeps CHANGELOG.md, LICENSE and a handwritten test across regeneration', async () => {
    await generateInto(root)
    const handwritten = {
      'screen-sharing/CHANGELOG.md': '# @macts/screen-sharing\n',
      'screen-sharing/src/screen-sharing.test.ts': `import { it } from 'vitest'\n`,
      'screen-sharing-server/CHANGELOG.md': '# @macts/screen-sharing-server\n',
    }
    await plant(root, handwritten)
    await plant(root, ISSUE_179_STALE_FILES)
    await recordAsPreviouslyEmitted(root, Object.keys(ISSUE_179_STALE_FILES))

    await generateInto(root)

    const files = await tree(root)
    for (const [path, content] of Object.entries(handwritten)) {
      expect(await readFile(join(root, path), 'utf-8')).toBe(content)
    }
    expect(files).toContain('screen-sharing/LICENSE')
    expect(files).toContain('screen-sharing-server/LICENSE')
  })

  it('without a record, prunes only the stale files that carry a generated header', async () => {
    await generateInto(root)
    for (const pkg of generated) {
      await unlink(join(root, pkg.dir, OWNED_OUTPUT_RECORD_FILE))
    }
    await plant(root, ISSUE_179_STALE_FILES)

    await generateInto(root)

    const files = await tree(root)
    expect(files).not.toContain('screen-sharing/src/resources/connection.ts')
    // The other five carry no header, so the bootstrap cannot tell them from
    // handwritten files and keeps them.
    for (const path of Object.keys(ISSUE_179_STALE_FILES)) {
      if (path === 'screen-sharing/src/resources/connection.ts') continue
      expect(files).toContain(path)
    }
  })
})
