/**
 * User-acceptance tests for `macts probe`, run in-process through clipanion
 * the way the binary runs it, with the automation runner and the probe
 * environment injected (no real app, no automation permission).
 *
 * The injected runner executes the probe's real automation-process body
 * against fake app objects in an isolated `node:vm` context, so the counts in
 * the output come from the same code that runs inside a real app.
 *
 * Expected output is derived by hand from the fixture.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10 (per-field nullability evidence)
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { runInNewContext } from 'node:vm'
import { Cli } from 'clipanion'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { APP_VERSION_BODY, type JxaRunner, type NullabilityProbeEnvironment } from '@macts/core'
import { ProbeCommand } from './probe.js'

/** A value that must never reach any output. */
const SECRET = 'SECRET-VALUE'

/**
 * The fixture app's notes: 40 of them, each property behaving as the fixture
 * says. With `brokenIds`, note 5 has no uid and reading note 6's uid throws.
 */
function fakeApp(brokenIds = false): object {
  const notes = Array.from({ length: 40 }, (_, i) => ({
    uid: () => {
      if (brokenIds && i === 6) throw new Error('AppleEvent handler failed.')
      return brokenIds && i === 5 ? null : `${SECRET}-uid-${String(i)}`
    },
    // Curated non-null, but 3 notes have none: a contradiction.
    title: () => (i < 3 ? null : `${SECRET}-title`),
    // Always set across 40 reads: non-null.
    wordCount: () => i + 1,
    // Throws for half the notes: 20 clean reads, below the threshold of 30.
    mood: () => {
      if (i % 2 === 0) throw new Error('AppleEvent handler failed.')
      return SECRET
    },
    // Always throws.
    locked: () => {
      throw new Error('AppleEvent handler failed.')
    },
    body: () => SECRET,
  }))
  // Shaped like the bridge's element specifier: the nullability probe reads
  // its length and indexes into it; the identifier probe calls it.
  const specifier = () => notes
  notes.forEach((note, index) => Object.defineProperty(specifier, index, { value: note }))
  Object.defineProperty(specifier, 'length', { value: notes.length })
  return { notes: specifier }
}

const MANIFEST = `version: '1.0'

app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []

resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    identifiers:
      - property: uid
        primary: true
    properties:
      uid:
        access: r
        type: string
        description: Id
      title:
        access: rw
        type: string
        description: Title
        nullable: false
        evidence:
          nullable:
            source: curated
            note: Jotter refuses untitled notes
      wordCount:
        access: r
        type: integer
        description: Words
      mood:
        access: r
        type: string
        description: Mood
      locked:
        access: r
        type: boolean
        description: Locked
      body:
        access: rw
        type: string
        description: Body

enums: {}

hierarchy:
  children:
    notes:
      resource: Note
      access: rw

commands: {}
`

/**
 * A runner that runs each body against the fake app, as the automation
 * process would. With `msPerTick`, the app process's clock advances that much
 * on every `Date.now()`, so a body hits its time limit after a few items.
 */
function fakeRunner(msPerTick?: number, brokenIds = false): JxaRunner {
  return (_bundleId, body) => {
    if (body === APP_VERSION_BODY) return Promise.resolve('2.1')
    let now = 0
    const clock = msPerTick === undefined ? Date : { now: () => (now += msPerTick) }
    const value: unknown = runInNewContext(`(function (app) {${body}})(app)`, {
      app: fakeApp(brokenIds),
      Date: clock,
    })
    return Promise.resolve(JSON.parse(JSON.stringify(value)) as unknown)
  }
}

const runner = fakeRunner()

const environment: NullabilityProbeEnvironment = {
  osVersion: () => Promise.resolve('27.2'),
  observedAt: () => '2026-10-31T12:00:00.000Z',
  clock: () => 0,
}

/** The probe command with the fake runner and environment. */
class TestProbeCommand extends ProbeCommand {
  protected override runner = runner
  protected override nullabilityEnvironment = environment
}

function streams() {
  let out = ''
  let err = ''
  const sink = (append: (text: string) => void) =>
    new Writable({
      write(chunk: Buffer | string, _encoding, callback) {
        append(chunk.toString())
        callback()
      },
    })
  return {
    stdout: sink((text) => (out += text)),
    stderr: sink((text) => (err += text)),
    output: () => out,
    errors: () => err,
  }
}

let dir = ''
let manifestPath = ''
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'macts-probe-cli-'))
  await mkdir(join(dir, 'jotter'))
  manifestPath = join(dir, 'jotter', 'app.yaml')
  await writeFile(manifestPath, MANIFEST)
})
afterEach(async () => {
  if (dir !== '') await rm(dir, { recursive: true, force: true })
})

/** The probe command against an app slow enough to hit the time limit. */
class SlowProbeCommand extends ProbeCommand {
  // 10 s per clock read against a 25 s call limit: two items, then stop.
  protected override runner = fakeRunner(10_000)
  protected override nullabilityEnvironment = environment
}

/** The probe command against an app whose notes' identifiers are not always present. */
class BrokenIdProbeCommand extends ProbeCommand {
  protected override runner = fakeRunner(undefined, true)
  protected override nullabilityEnvironment = environment
}

/** A manifest whose Cards are nested in Shelves, to show sampling across parents. */
const NESTED_MANIFEST = `version: '1.0'
app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []
resources:
  Shelf:
    name: Shelf
    plural: Shelves
    description: A shelf
    properties:
      label: { access: r, type: string, description: Label }
  Card:
    name: Card
    plural: Cards
    description: A card
    properties:
      label: { access: r, type: string, description: Label }
enums: {}
hierarchy:
  children:
    shelves:
      resource: Shelf
      access: r
      children:
        cards: { resource: Card, access: r }
commands: {}
`

/** The probe command against an app with three shelves of 50, 20, and 0 cards. */
class NestedProbeCommand extends ProbeCommand {
  protected override runner: JxaRunner = (_bundleId, body) => {
    if (body === APP_VERSION_BODY) return Promise.resolve('2.1')
    const shelf = (cards: number) => ({
      label: () => SECRET,
      cards: Array.from({ length: cards }, (_, i) => ({
        label: () => (i % 2 === 0 ? null : SECRET),
      })),
    })
    const app = { shelves: [shelf(50), shelf(20), shelf(0)] }
    const value: unknown = runInNewContext(`(function (app) {${body}})(app)`, { app })
    return Promise.resolve(JSON.parse(JSON.stringify(value)) as unknown)
  }
  protected override nullabilityEnvironment = environment
}

/** The probe command against an app so slow the time limit hits before any item. */
class StalledProbeCommand extends ProbeCommand {
  // 30 s per clock read against a 25 s call limit: the first check stops it.
  protected override runner = fakeRunner(30_000)
  protected override nullabilityEnvironment = environment
}

async function run(args: readonly string[], command: typeof ProbeCommand = TestProbeCommand) {
  const cli = new Cli({ binaryLabel: 'macts', binaryName: 'macts' })
  cli.register(command)
  const io = streams()
  const exitCode = await cli.run(['probe', 'jotter', '--manifests-dir', dir, ...args], {
    stdout: io.stdout,
    stderr: io.stderr,
  })
  return { exitCode, stdout: io.output(), stderr: io.errors() }
}

describe('macts probe --nullability --dry-run --json', () => {
  it('reports counts and decisions per property, exits 0, and writes nothing', async () => {
    const { exitCode, stdout, stderr } = await run(['--nullability', '--dry-run', '--json'])
    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout)).toEqual({
      bundleId: 'com.example.jotter',
      appName: 'Jotter',
      appVersion: '2.1',
      osVersion: '27.2',
      observedAt: '2026-10-31T12:00:00.000Z',
      resources: [
        {
          resource: 'Note',
          accessPath: 'notes',
          status: 'probed',
          itemsRead: 40,
          sampledParents: 1,
          truncated: false,
          properties: [
            // The identifier never gets a claim.
            {
              property: 'uid',
              reads: 40,
              nulls: 0,
              failures: 0,
              observation: 'non-null',
              change: 'unchanged',
            },
            {
              property: 'title',
              reads: 40,
              nulls: 3,
              failures: 0,
              observation: 'nullable',
              change: 'set',
              contradicted: 'curated',
            },
            {
              property: 'wordCount',
              reads: 40,
              nulls: 0,
              failures: 0,
              observation: 'non-null',
              change: 'set',
            },
            {
              property: 'mood',
              reads: 20,
              nulls: 0,
              failures: 20,
              observation: 'insufficient-sample',
              change: 'unchanged',
            },
            {
              property: 'locked',
              reads: 0,
              nulls: 0,
              failures: 40,
              observation: 'read-failed',
              change: 'unchanged',
            },
          ],
          skipped: [{ property: 'body', reason: 'heavy' }],
        },
      ],
    })
    expect(stderr).toContain('(dry-run — manifest NOT written)')
    expect(await readFile(manifestPath, 'utf-8')).toBe(MANIFEST)
    expect(`${stdout}${stderr}`).not.toContain(SECRET)
  })
})

describe('macts probe --nullability (human output)', () => {
  it('prints each verdict with counts and the contradiction, and never a value', async () => {
    const { exitCode, stdout } = await run(['--nullability', '--dry-run'])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('Nullability of Jotter 2.1 (com.example.jotter) on macOS 27.2\n')
    expect(stdout).toContain('Note  (notes) — 40 items read\n')
    expect(stdout).toContain('  uid        non-null             (0 of 40 empty)\n')
    expect(stdout).toContain(
      '  title      nullable             (3 of 40 empty)  [contradicts curated non-null claim]\n'
    )
    expect(stdout).toContain('  wordCount  non-null             (0 of 40 empty)\n')
    expect(stdout).toContain('  mood       insufficient sample  (0 of 20 empty, 20 reads failed)\n')
    expect(stdout).toContain('  locked     read failed          (40 reads failed)\n')
    expect(stdout).toContain('  body       skipped (large content)\n')
    expect(stdout).toContain('Contradictions: Note.title (curated non-null claim replaced)\n')
    expect(stdout).not.toContain(SECRET)
  })
})

describe('macts probe --nullability (time limit)', () => {
  it('says the time limit cut the sample short, in the output and the manifest', async () => {
    const human = await run(['--nullability', '--dry-run'], SlowProbeCommand)
    expect(human.exitCode).toBe(0)
    expect(human.stdout).toContain('Note  (notes) — 2 items read, stopped early (time limit)\n')
    expect(human.stdout).toContain('  wordCount  insufficient sample  (0 of 2 empty)\n')
    expect(human.stdout).toContain('  note: stopped at the time limit after 2 items\n')

    const json = await run(['--nullability', '--dry-run', '--json'], SlowProbeCommand)
    expect(JSON.parse(json.stdout)).toMatchObject({
      resources: [
        {
          resource: 'Note',
          itemsRead: 2,
          truncated: true,
          note: 'stopped at the time limit after 2 items',
        },
      ],
    })

    expect((await run(['--nullability'], SlowProbeCommand)).exitCode).toBe(0)
    const written = await readFile(manifestPath, 'utf-8')
    expect(written).toContain(`    nullabilityProbe:
      observedAt: '2026-10-31T12:00:00.000Z'
      bundleId: com.example.jotter
      appVersion: '2.1'
      osVersion: '27.2'
      accessPath: notes
      itemsRead: 2
      sampledParents: 1
      status: probed
      skipped:
        - body
      note: stopped at the time limit after 2 items
`)
  })
})

describe('macts probe --nullability (time budget spent before any item)', () => {
  // Regression: a resource that read no items was reported as "stopped at the
  // time limit after 0 items", and its properties as "read failed (0 reads failed)".
  it('says the resource was not probed, and lists no verdicts in human output', async () => {
    const human = await run(['--nullability', '--dry-run'], StalledProbeCommand)
    expect(human.exitCode).toBe(0)
    expect(human.stdout).toContain('Note  (notes) — skipped (time budget spent)\n\n')
    expect(human.stdout).not.toContain('stopped early')
    expect(human.stdout).not.toContain('read failed')
    expect(human.stdout).not.toContain('  uid ')
    expect(human.stdout).not.toContain('note:')
  })

  it('keeps the properties in the JSON report, as not read', async () => {
    const json = await run(['--nullability', '--dry-run', '--json'], StalledProbeCommand)
    const report = JSON.parse(json.stdout) as {
      resources: { status: string; note: string; properties: { observation: string }[] }[]
    }
    const [note] = report.resources
    expect(note).toMatchObject({
      status: 'budget',
      itemsRead: 0,
      note: 'not probed: the time budget was spent',
    })
    // uid, title, wordCount, mood, locked: every read property, none read.
    expect(note?.properties.map((p) => p.observation)).toEqual([
      'not-read',
      'not-read',
      'not-read',
      'not-read',
      'not-read',
    ])
  })

  it('records the fixed budget note in the manifest', async () => {
    expect((await run(['--nullability'], StalledProbeCommand)).exitCode).toBe(0)
    const written = await readFile(manifestPath, 'utf-8')
    expect(written).toContain(`      itemsRead: 0
      sampledParents: 0
      status: budget
      skipped:
        - body
      note: 'not probed: the time budget was spent'
`)
  })
})

describe('macts probe --nullability (identifier defects)', () => {
  it('reports an identifier empty or unreadable in any item, with counts and no value', async () => {
    const human = await run(['--nullability', '--dry-run'], BrokenIdProbeCommand)
    expect(human.exitCode).toBe(0)
    expect(human.stdout).toContain(
      '  uid        nullable             (1 of 39 empty, 1 reads failed)  [manifest defect: identifier not always present]\n'
    )
    expect(human.stdout).toContain(
      'Manifest defects: the primary identifier is not always present for Note.uid (empty 1, failed 1 of 40 items); choose a different identifier.\n'
    )
    expect(human.stdout).not.toContain(SECRET)

    const json = await run(['--nullability', '--dry-run', '--json'], BrokenIdProbeCommand)
    expect(JSON.parse(json.stdout)).toMatchObject({
      resources: [
        {
          resource: 'Note',
          identifierDefect: { property: 'uid', itemsRead: 40, empty: 1, failed: 1, probed: true },
        },
      ],
    })
  })

  it('writes no claim for the identifier', async () => {
    expect((await run(['--nullability'], BrokenIdProbeCommand)).exitCode).toBe(0)
    const written = await readFile(manifestPath, 'utf-8')
    expect(written).toContain(`      uid:
        access: r
        type: string
        description: Id
      title:`)
  })

  it('reports no defect when the identifier is present in every item', async () => {
    const { stdout } = await run(['--nullability', '--dry-run'])
    expect(stdout).not.toContain('manifest defect')
    expect(stdout).not.toContain('Manifest defects')
  })
})

describe('macts probe --nullability (nested resources)', () => {
  it('samples every non-empty parent and reports how many', async () => {
    await writeFile(manifestPath, NESTED_MANIFEST)
    const human = await run(
      ['--nullability', '--dry-run', '--resource', 'Card'],
      NestedProbeCommand
    )
    expect(human.exitCode).toBe(0)
    // Two non-empty shelves share the 60-item cap, 30 each: 30 of the 50
    // cards from the first, all 20 from the second.
    expect(human.stdout).toContain('Card  (shelves/cards) — 50 items read from 2 parents\n')

    const json = await run(
      ['--nullability', '--dry-run', '--json', '--resource', 'Card'],
      NestedProbeCommand
    )
    expect(JSON.parse(json.stdout)).toMatchObject({
      resources: [{ resource: 'Card', itemsRead: 50, sampledParents: 2 }],
    })
    expect(human.stdout).not.toContain(SECRET)
  })
})

describe('macts probe --nullability (keeping earlier evidence)', () => {
  it('keeps the earlier probe record when a later probe reads nothing, and says so', async () => {
    expect((await run(['--nullability'])).exitCode).toBe(0)
    const probed = await readFile(manifestPath, 'utf-8')
    expect(probed).toContain('      itemsRead: 40\n')

    const stalled = await run(['--nullability'], StalledProbeCommand)
    expect(stalled.exitCode).toBe(0)
    expect(stalled.stderr).toContain(
      'Kept the earlier nullability probe record for Note: this probe read no items there.\n'
    )
    expect(await readFile(manifestPath, 'utf-8')).toBe(probed)
  })
})

describe('macts probe --nullability (writing)', () => {
  it('records the evidence in the manifest', async () => {
    const { exitCode, stderr } = await run(['--nullability'])
    expect(exitCode).toBe(0)
    expect(stderr).toContain(`Wrote nullability evidence to ${manifestPath}`)
    const written = await readFile(manifestPath, 'utf-8')
    expect(written).toContain(`      wordCount:
        access: r
        type: integer
        description: Words
        nullable: false
        evidence:
          nullable:
            source: probe
            observedAt: '2026-10-31T12:00:00.000Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 40
            nullCount: 0
            failedReads: 0
`)
    expect(written).toContain('            note: replaced curated non-null claim\n')
    expect(written).toContain('    nullabilityProbe:\n')
    expect(written).not.toContain(SECRET)
  })
})

describe('macts probe --nullability (options)', () => {
  it('reads fewer items with --max-items and skips named properties', async () => {
    const { exitCode, stdout } = await run([
      '--nullability',
      '--dry-run',
      '--json',
      '--max-items',
      '10',
      '--skip-property',
      'mood',
    ])
    expect(exitCode).toBe(0)
    const report: unknown = JSON.parse(stdout)
    expect(report).toMatchObject({
      resources: [
        {
          itemsRead: 10,
          skipped: [
            { property: 'mood', reason: 'excluded' },
            { property: 'body', reason: 'heavy' },
          ],
        },
      ],
    })
  })

  it('rejects a --max-items that is not a whole number', async () => {
    const { exitCode, stderr } = await run(['--nullability', '--max-items', 'lots'])
    expect(exitCode).toBe(1)
    expect(stderr).toContain('--max-items must be a whole number, got "lots".')
  })

  // Regression: --max-items 0 probed nothing and wrote a 'no-items' block over
  // real evidence.
  it('rejects --max-items 0, a negative, or a fraction, and writes nothing', async () => {
    for (const [value, message] of [
      ['0', '--max-items must be at least 1, got 0.'],
      ['-3', '--max-items must be a whole number, got "-3".'],
      ['2.5', '--max-items must be a whole number, got "2.5".'],
    ] as const) {
      const { exitCode, stderr } = await run(['--nullability', `--max-items=${value}`])
      expect(exitCode).toBe(1)
      expect(stderr).toContain(message)
      expect(await readFile(manifestPath, 'utf-8')).toBe(MANIFEST)
    }
  })
})

describe('macts probe (identifier mode)', () => {
  it('behaves as before without --nullability', async () => {
    const { exitCode, stdout } = await run(['--dry-run', '--json'])
    expect(exitCode).toBe(0)
    const report: unknown = JSON.parse(stdout)
    expect(report).toMatchObject({
      bundleId: 'com.example.jotter',
      resources: { Note: { runtimeIdentifier: 'uid', probe: { status: 'probed' } } },
    })
  })
})
