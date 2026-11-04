/**
 * UAT for `macts generate`: generation diagnostics, and the generator's
 * ownership of its output.
 *
 * Drives the real built CLI binary as a subprocess against a small manifest
 * written to a temporary directory, as a user would run it. A manifest type
 * the generated contract cannot resolve is described as `unknown`; the CLI
 * must report it on stderr as a warning naming the app, the manifest
 * position, and the declared type, and still succeed.
 *
 * Each generated package records what the run emitted in its
 * `.macts-generated.json`. Regenerating after a resource is removed from the
 * manifest must delete the files only that resource produced, name each on
 * stdout, keep files the generator never emitted, and leave the package as a
 * fresh generate would.
 *
 * A manifest with a command that must name one item and declares no
 * identifier parameter (phases/13 D5) is refused: the CLI prints the refusal,
 * naming the app and the command, exits 1, and writes and prunes nothing.
 *
 * @see https://github.com/mike-north/macts/issues/179
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D2 (generated contracts)
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
const binPath = resolve(here, '../../dist/bin.js')

/**
 * The Sketchpad `Page` resource and its `listPages` command, which the
 * owned-output UAT later removes from the manifest.
 */
const PAGE_RESOURCE = `  Page:
    name: Page
    plural: Pages
    description: A page
    properties:
      uid:
        access: r
        type: string
        description: The page's identifier
    identifiers:
      - property: uid
        primary: true
        targeting: byId
`
const LIST_PAGES_COMMAND = `  listPages:
    name: list
    description: List pages
    scope: resource
    resourceType: Page
`

/** An application-scoped delete with no parameters, which names no item. */
const APPLICATION_DELETE_COMMAND = `  delete:
    name: delete
    description: Delete an object
    scope: application
`

/** A manifest whose `Note.layout` names a resource the manifest does not declare. */
function sketchpadManifest(layoutType: string, withPages = false, extraCommands = ''): string {
  return `version: '1.0'
app:
  bundleId: com.example.sketchpad
  name: Sketchpad
  tccEntitlements: []
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties:
      uid:
        access: r
        type: string
        description: The note's identifier
      layout:
        access: r
        type: ${layoutType}
        description: How the note is laid out
    identifiers:
      - property: uid
        primary: true
        targeting: byId
${withPages ? PAGE_RESOURCE : ''}enums: {}
hierarchy:
  children: {}
commands:
  listNotes:
    name: list
    description: List notes
    scope: resource
    resourceType: Note
${withPages ? LIST_PAGES_COMMAND : ''}${extraCommands}`
}

interface CliResult {
  readonly stdout: string
  readonly stderr: string
  readonly code: number
}

async function runCli(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, ...args])
    return { stdout, stderr, code: 0 }
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; code?: number }
    return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '', code: failure.code ?? 1 }
  }
}

describe('macts generate (UAT): diagnostics', () => {
  let dir = ''

  beforeAll(() => {
    if (!existsSync(binPath)) {
      throw new Error(
        `Built CLI not found at ${binPath}. Run \`pnpm --filter @macts/cli build\` before this UAT.`
      )
    }
  })

  afterEach(async () => {
    if (dir !== '') await rm(dir, { recursive: true, force: true })
    dir = ''
  })

  async function generate(layoutType: string): Promise<CliResult> {
    dir = await mkdtemp(join(tmpdir(), 'macts-generate-uat-'))
    const manifestPath = join(dir, 'app.yaml')
    await writeFile(manifestPath, sketchpadManifest(layoutType))
    return runCli(['generate', manifestPath, '--out-dir', join(dir, 'out'), '--target', 'all'])
  }

  it('warns on stderr about an unresolved type, and exits 0', async () => {
    const result = await generate('{ resource: page layout }')

    expect(result.code).toBe(0)
    expect(result.stderr).toBe(
      'warning: sketchpad: resources.Note.properties.layout: the type {"resource":"page layout"} ' +
        'names no resource or enum, so the contract describes it as unknown.\n'
    )
    expect(result.stdout).not.toContain('warning')
    // The packages are still written: a diagnostic is a tolerated fallback.
    expect(existsSync(join(dir, 'out', 'sketchpad', 'src', 'contract', 'index.ts'))).toBe(true)
  }, 60_000)

  it('prints no warning when every type resolves', async () => {
    const result = await generate('string')

    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
  }, 60_000)
})

describe('macts generate (UAT): owned output', () => {
  let dir = ''

  beforeAll(() => {
    if (!existsSync(binPath)) {
      throw new Error(
        `Built CLI not found at ${binPath}. Run \`pnpm --filter @macts/cli build\` before this UAT.`
      )
    }
  })

  afterEach(async () => {
    if (dir !== '') await rm(dir, { recursive: true, force: true })
    dir = ''
  })

  async function generateInto(outDir: string, withPages: boolean): Promise<CliResult> {
    const manifestPath = join(dir, 'app.yaml')
    await writeFile(manifestPath, sketchpadManifest('string', withPages))
    return runCli(['generate', manifestPath, '--out-dir', outDir, '--target', 'all'])
  }

  async function recorded(packageDir: string): Promise<string[]> {
    const record = JSON.parse(
      await readFile(join(packageDir, '.macts-generated.json'), 'utf-8')
    ) as { files: string[] }
    return record.files
  }

  async function tree(root: string): Promise<string[]> {
    const entries = await readdir(root, { recursive: true, withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1))
      .sort()
  }

  it('deletes the files of a removed resource, names them, and keeps handwritten files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-generate-uat-'))
    const out = join(dir, 'out')
    const client = join(out, 'sketchpad')

    const first = await generateInto(out, true)
    expect(first.code).toBe(0)
    // A directory that is not yet a package has no previous set to bootstrap.
    expect(first.stdout).not.toContain('bootstrapped')
    const before = await recorded(client)

    await writeFile(join(client, 'CHANGELOG.md'), '# @macts/sketchpad\n')
    await writeFile(join(client, 'src', 'notes.test.ts'), `import { it } from 'vitest'\n`)

    const second = await generateInto(out, false)
    expect(second.code).toBe(0)
    expect(second.stdout).not.toContain('bootstrapped')

    const after = new Set(await recorded(client))
    const removed = before.filter((path) => !after.has(path))
    // The SDK emitter writes one client module per resource.
    expect(removed).toContain('src/resources/page.ts')
    for (const path of removed) {
      expect(second.stdout).toContain(`pruned ${join(client, path)}\n`)
      expect(existsSync(join(client, path))).toBe(false)
    }
    expect(existsSync(join(client, 'CHANGELOG.md'))).toBe(true)
    expect(existsSync(join(client, 'src', 'notes.test.ts'))).toBe(true)

    const fresh = join(dir, 'fresh')
    expect((await generateInto(fresh, false)).code).toBe(0)
    expect(
      (await tree(out)).filter(
        (path) => !path.endsWith('CHANGELOG.md') && !path.endsWith('notes.test.ts')
      )
    ).toEqual(await tree(fresh))
  }, 60_000)
})

describe('macts generate (UAT): a manifest the item-selection rule refuses', () => {
  let dir = ''

  beforeAll(() => {
    if (!existsSync(binPath)) {
      throw new Error(
        `Built CLI not found at ${binPath}. Run \`pnpm --filter @macts/cli build\` before this UAT.`
      )
    }
  })

  afterEach(async () => {
    if (dir !== '') await rm(dir, { recursive: true, force: true })
    dir = ''
  })

  /** The refusal for {@link APPLICATION_DELETE_COMMAND}, written by hand from phases/13 D5. */
  const REFUSAL =
    'App "Sketchpad" cannot be generated from its manifest: its application-scoped delete command "delete" declares no identifier parameter. A delete acts on one item, selected by a required parameter, so without one no item can be selected. Scope "delete" to the resource whose items it deletes and declare the item\'s identifier as a required parameter.'

  async function generateInto(outDir: string, extraCommands: string): Promise<CliResult> {
    const manifestPath = join(dir, 'app.yaml')
    await writeFile(manifestPath, sketchpadManifest('string', false, extraCommands))
    return runCli(['generate', manifestPath, '--out-dir', outDir, '--target', 'all'])
  }

  /** Every file under `root` with its content, or an empty list when it does not exist. */
  async function filesUnder(root: string): Promise<[string, string][]> {
    if (!existsSync(root)) return []
    const entries = await readdir(root, { recursive: true, withFileTypes: true })
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
      .sort()
    return Promise.all(
      files.map(
        async (path): Promise<[string, string]> => [
          path.slice(root.length + 1),
          await readFile(path, 'utf-8'),
        ]
      )
    )
  }

  // Guards the user-visible refusal: the error names the app and the command
  // and says what to declare, the exit code is 1, and no file is written.
  it('exits 1 naming the app and command, and writes no files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-generate-uat-'))
    const out = join(dir, 'out')

    const result = await generateInto(out, APPLICATION_DELETE_COMMAND)

    expect(result.code).toBe(1)
    expect(result.stderr).toContain(`Errors during generation:\n  - ${REFUSAL}\n`)
    expect(result.stdout).not.toContain('Writing')
    expect(await filesUnder(out)).toEqual([])
  }, 60_000)

  // Guards that a refusal never prunes: a package generated earlier from the
  // same app is left exactly as it was, so a refused run cannot delete the
  // files a previous run owns.
  it('leaves a previously generated package untouched', async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-generate-uat-'))
    const out = join(dir, 'out')
    expect((await generateInto(out, '')).code).toBe(0)
    const before = await filesUnder(out)
    expect(before.length).toBeGreaterThan(0)

    const refused = await generateInto(out, APPLICATION_DELETE_COMMAND)

    expect(refused.code).toBe(1)
    expect(refused.stderr).toContain(REFUSAL)
    expect(refused.stdout).not.toContain('pruned')
    expect(await filesUnder(out)).toEqual(before)
  }, 60_000)
})
