/**
 * Tests for writing probe results back into manifest files.
 *
 * Bug fixed here: the identifier probe writer reloaded and re-dumped the whole
 * manifest, so comments, blank lines, and quoting were lost and nearly every
 * line changed (101 of 102 on TextEdit). The writers now edit the document in
 * place, and these tests assert that every line outside the blocks they write
 * is unchanged, on copies of real manifests and on a fixture carrying
 * nullability and resettability claims.
 *
 * Expected blocks and files are written by hand from the probe results and
 * the YAML structure.
 *
 * @see https://eemeli.org/yaml/#documents (format-preserving document edits)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (per-field evidence)
 */

import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import * as jsYaml from 'js-yaml'
import { isNode, parseDocument } from 'yaml'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../manifest/loader.js'
import type { NullabilityProbe } from '../manifest/schemas/resource.js'
import type { NullabilityMergeResult, PropertyMergeOutcome } from './nullability-merge.js'
import type { AppProbeResult } from './probe.js'
import { writeNullabilityResults, writeProbeResults } from './writer.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')
const PROBED_AT = '2026-10-31T12:00:00.000Z'

let dir = ''
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'macts-writer-'))
})
afterEach(async () => {
  if (dir !== '') await rm(dir, { recursive: true, force: true })
})

/** An identifier probe result for the named resources. */
function probeResult(bundleId: string, resources: Record<string, string>): AppProbeResult {
  return {
    bundleId,
    appName: 'App',
    probedAt: PROBED_AT,
    resources: Object.fromEntries(
      Object.entries(resources).map(([resource, runtimeIdentifier]) => [
        resource,
        {
          resource,
          runtimeIdentifier,
          candidates: [{ property: runtimeIdentifier, succeeded: true }],
          probe: { status: 'probed', runtimeIdentifier, probedAt: PROBED_AT },
        },
      ])
    ),
  }
}

/**
 * Split `after` into the lines of `before`, in order, and the runs of lines
 * inserted between them. Fails when a line of `before` is missing or changed.
 */
function insertedRuns(before: string, after: string): string[][] {
  const original = before.split('\n')
  const updated = after.split('\n')
  const runs: string[][] = []
  let current: string[] = []
  let i = 0
  for (const line of updated) {
    if (i < original.length && line === original[i]) {
      if (current.length > 0) runs.push(current)
      current = []
      i++
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) runs.push(current)
  expect(i, 'every original line survives, unchanged and in order').toBe(original.length)
  return runs
}

/** Parse an inserted block of YAML, removing its common indentation. */
function parseBlock(lines: readonly string[]): unknown {
  const indent = Math.min(...lines.map((line) => line.length - line.trimStart().length))
  return jsYaml.load(lines.map((line) => line.slice(indent)).join('\n'))
}

describe('writeProbeResults: format preservation (regression)', () => {
  it('on TextEdit, inserts only the probe block and leaves every other line unchanged', async () => {
    const path = join(dir, 'app.yaml')
    await copyFile(join(MANIFESTS_DIR, 'textedit', 'app.yaml'), path)
    const before = await readFile(path, 'utf-8')
    // The copy has what the old writer destroyed: blank lines and single quotes.
    expect(before).toContain("version: '1.0'")
    expect(before).toContain('\n\n')

    await writeProbeResults(path, probeResult('com.apple.TextEdit', { Document: 'name' }))
    const after = await readFile(path, 'utf-8')

    const runs = insertedRuns(before, after)
    expect(runs).toHaveLength(1)
    expect(runs[0]?.[0]).toBe('    probe:')
    expect(parseBlock(runs[0] ?? [])).toEqual({
      probe: { status: 'probed', runtimeIdentifier: 'name', probedAt: PROBED_AT },
    })
    expect(parseManifestYaml(after).resources['Document']?.probe).toEqual({
      status: 'probed',
      runtimeIdentifier: 'name',
      probedAt: PROBED_AT,
    })
  })

  it('on Calendar, keeps its comments and inserts one block per probed resource', async () => {
    const path = join(dir, 'app.yaml')
    await copyFile(join(MANIFESTS_DIR, 'calendar', 'app.yaml'), path)
    const before = await readFile(path, 'utf-8')
    expect(before).toMatch(/^\s*#/m)

    await writeProbeResults(path, probeResult('com.apple.iCal', { Calendar: 'name', Event: 'uid' }))
    const after = await readFile(path, 'utf-8')

    const runs = insertedRuns(before, after)
    expect(runs.map((run) => parseBlock(run))).toEqual([
      { probe: { status: 'probed', runtimeIdentifier: 'name', probedAt: PROBED_AT } },
      { probe: { status: 'probed', runtimeIdentifier: 'uid', probedAt: PROBED_AT } },
    ])
    const manifest = parseManifestYaml(after)
    expect(manifest.resources['Calendar']?.probe?.runtimeIdentifier).toBe('name')
    expect(manifest.resources['Event']?.probe?.runtimeIdentifier).toBe('uid')
  })

  it('quotes the timestamp, so the loader reads it back as text', async () => {
    const path = join(dir, 'app.yaml')
    await copyFile(join(MANIFESTS_DIR, 'textedit', 'app.yaml'), path)
    await writeProbeResults(path, probeResult('com.apple.TextEdit', { Document: 'name' }))
    expect(await readFile(path, 'utf-8')).toContain(`      probedAt: '${PROBED_AT}'\n`)
  })
})

/** A small manifest with comments, blank lines, quoting, and D10 claims. */
const CLAIMS_MANIFEST = `# Jotter, for writer tests
version: '1.0'

app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []

resources:
  Note:
    name: Note
    plural: Notes
    description: 'A note' # quoted on purpose
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
            note: 'Jotter refuses untitled notes'
      priority:
        access: rw
        type: string
        description: Priority
        resettable: true
        evidence:
          resettable:
            source: curated
            note: reset.test.ts clears it
      created:
        access: r
        type: date
        description: Created
      label:
        access: r
        type: string
        description: Label
        nullable: false
        evidence:
          nullable:
            source: curated
            note: Every note is labeled

enums: {}

hierarchy:
  children: {}

commands: {}
`

describe('writeProbeResults: evidence survives', () => {
  it('leaves nullability and resettability claims byte for byte as they were', async () => {
    const path = join(dir, 'app.yaml')
    await writeFile(path, CLAIMS_MANIFEST)
    await writeProbeResults(path, probeResult('com.example.jotter', { Note: 'uid' }))
    const after = await readFile(path, 'utf-8')
    const runs = insertedRuns(CLAIMS_MANIFEST, after)
    expect(runs.map((run) => parseBlock(run))).toEqual([
      { probe: { status: 'probed', runtimeIdentifier: 'uid', probedAt: PROBED_AT } },
    ])
  })
})

/** The merge decisions the nullability writer is given in these tests. */
function merged(): NullabilityMergeResult {
  const provenance = {
    source: 'probe',
    observedAt: PROBED_AT,
    bundleId: 'com.example.jotter',
    appVersion: '2.1',
    osVersion: '27.2',
  } as const
  return {
    bundleId: 'com.example.jotter',
    appName: 'Jotter',
    resources: [
      {
        resource: 'Note',
        block: {
          observedAt: PROBED_AT,
          bundleId: 'com.example.jotter',
          appVersion: '2.1',
          osVersion: '27.2',
          accessPath: 'notes',
          itemsRead: 40,
          status: 'probed',
          skipped: ['body'],
        },
        properties: [
          {
            property: 'uid',
            presence: { reads: 40, nulls: 0, failures: 0 },
            observation: 'non-null',
            change: 'unchanged',
          },
          {
            property: 'title',
            presence: { reads: 40, nulls: 3, failures: 1 },
            observation: 'nullable',
            change: 'set',
            claim: {
              nullable: true,
              evidence: {
                ...provenance,
                sampleSize: 40,
                nullCount: 3,
                failedReads: 1,
                note: 'replaced curated non-null claim',
              },
            },
            contradicted: 'curated',
          },
          {
            property: 'priority',
            presence: { reads: 30, nulls: 0, failures: 2 },
            observation: 'non-null',
            change: 'set',
            claim: {
              nullable: false,
              evidence: { ...provenance, sampleSize: 30, nullCount: 0, failedReads: 2 },
            },
          },
          {
            property: 'created',
            presence: { reads: 12, nulls: 0, failures: 0 },
            observation: 'insufficient-sample',
            change: 'unchanged',
          },
          {
            property: 'label',
            presence: { reads: 40, nulls: 0, failures: 0 },
            observation: 'non-null',
            change: 'unchanged',
          },
        ],
      },
    ],
  }
}

describe('writeNullabilityResults', () => {
  it('upserts claims and the probe block, and changes nothing else', async () => {
    const path = join(dir, 'app.yaml')
    await writeFile(path, CLAIMS_MANIFEST)
    await writeNullabilityResults(path, merged())
    // Hand-written: title's curated non-null claim is replaced by the
    // contradicting observation; priority gains a non-null claim beside its
    // untouched resettability evidence; created and label are unchanged; the
    // probe block follows the properties.
    expect(await readFile(path, 'utf-8')).toBe(`# Jotter, for writer tests
version: '1.0'

app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []

resources:
  Note:
    name: Note
    plural: Notes
    description: 'A note' # quoted on purpose
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
        nullable: true
        evidence:
          nullable:
            source: probe
            observedAt: '2026-10-31T12:00:00.000Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 40
            nullCount: 3
            failedReads: 1
            note: replaced curated non-null claim
      priority:
        access: rw
        type: string
        description: Priority
        resettable: true
        evidence:
          resettable:
            source: curated
            note: reset.test.ts clears it
          nullable:
            source: probe
            observedAt: '2026-10-31T12:00:00.000Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 30
            nullCount: 0
            failedReads: 2
        nullable: false
      created:
        access: r
        type: date
        description: Created
      label:
        access: r
        type: string
        description: Label
        nullable: false
        evidence:
          nullable:
            source: curated
            note: Every note is labeled
    nullabilityProbe:
      observedAt: '2026-10-31T12:00:00.000Z'
      bundleId: com.example.jotter
      appVersion: '2.1'
      osVersion: '27.2'
      accessPath: notes
      itemsRead: 40
      status: probed
      skipped:
        - body

enums: {}

hierarchy:
  children: {}

commands: {}
`)
  })

  it('writes a manifest that loads with the claims intact', async () => {
    const path = join(dir, 'app.yaml')
    await writeFile(path, CLAIMS_MANIFEST)
    await writeNullabilityResults(path, merged())
    const note = parseManifestYaml(await readFile(path, 'utf-8')).resources['Note']
    expect(note?.properties['title']?.nullable).toBe(true)
    expect(note?.properties['priority']).toMatchObject({
      resettable: true,
      nullable: false,
      evidence: { resettable: { note: 'reset.test.ts clears it' }, nullable: { sampleSize: 30 } },
    })
    expect(note?.nullabilityProbe?.observedAt).toBe(PROBED_AT)
  })

  it('refuses to write a manifest that would not load, leaving the file as it was', async () => {
    const path = join(dir, 'app.yaml')
    await writeFile(path, CLAIMS_MANIFEST)
    const result = merged()
    const broken: NullabilityMergeResult = {
      ...result,
      resources: result.resources.map((resource) => ({
        ...resource,
        properties: resource.properties.map((outcome) =>
          outcome.claim === undefined
            ? outcome
            : // A non-null claim cannot rest on observed empty values.
              { ...outcome, claim: { ...outcome.claim, nullable: false } }
        ),
      })),
    }
    await expect(writeNullabilityResults(path, broken)).rejects.toThrow('the result would not load')
    expect(await readFile(path, 'utf-8')).toBe(CLAIMS_MANIFEST)
  })
})

/** A probe block for `merged()`'s Note resource, read with `itemsRead` items. */
function noteBlock(status: NullabilityProbe['status'], itemsRead: number): NullabilityProbe {
  return {
    observedAt: '2026-11-01T09:00:00.000Z',
    bundleId: 'com.example.jotter',
    appVersion: '2.2',
    osVersion: '27.2',
    accessPath: 'notes',
    itemsRead,
    status,
    skipped: ['body'],
  }
}

/** A merge result for Note whose probe read nothing: every property unread. */
function unreadNote(status: NullabilityProbe['status']): NullabilityMergeResult {
  return {
    bundleId: 'com.example.jotter',
    appName: 'Jotter',
    resources: [
      {
        resource: 'Note',
        block: noteBlock(status, 0),
        properties: [
          {
            property: 'created',
            presence: { reads: 0, nulls: 0, failures: 0 },
            observation: 'not-read',
            change: 'unchanged',
          },
        ],
      },
    ],
  }
}

describe('writeNullabilityResults: a probe that read nothing', () => {
  // Regression: a probe that read no item (out of time, unreachable, failed,
  // or empty) overwrote the block describing the sample the claims came from.
  for (const status of ['budget', 'error', 'unreachable', 'no-items'] as const) {
    it(`keeps an earlier block that read items, on status ${status}`, async () => {
      const path = join(dir, 'app.yaml')
      await writeFile(path, CLAIMS_MANIFEST)
      await writeNullabilityResults(path, merged())
      const probed = await readFile(path, 'utf-8')
      expect(probed).toContain('      itemsRead: 40\n')

      const written = await writeNullabilityResults(path, unreadNote(status))
      expect(written.keptEarlierBlocks).toEqual(['Note'])
      expect(await readFile(path, 'utf-8')).toBe(probed)
    })
  }

  it('writes the block when there is no earlier one', async () => {
    const path = join(dir, 'app.yaml')
    await writeFile(path, CLAIMS_MANIFEST)
    const written = await writeNullabilityResults(path, unreadNote('budget'))
    expect(written.keptEarlierBlocks).toEqual([])
    expect(
      parseManifestYaml(await readFile(path, 'utf-8')).resources['Note']?.nullabilityProbe
    ).toEqual(noteBlock('budget', 0))
  })

  it('replaces an earlier block that read nothing either', async () => {
    const path = join(dir, 'app.yaml')
    await writeFile(path, CLAIMS_MANIFEST)
    await writeNullabilityResults(path, unreadNote('no-items'))
    const written = await writeNullabilityResults(path, unreadNote('unreachable'))
    expect(written.keptEarlierBlocks).toEqual([])
    expect(
      parseManifestYaml(await readFile(path, 'utf-8')).resources['Note']?.nullabilityProbe?.status
    ).toBe('unreachable')
  })

  it('replaces an earlier block with a new one that read items', async () => {
    const path = join(dir, 'app.yaml')
    await writeFile(path, CLAIMS_MANIFEST)
    await writeNullabilityResults(path, merged())
    const result = merged()
    const again: NullabilityMergeResult = {
      ...result,
      resources: result.resources.map((r) => ({ ...r, block: noteBlock('probed', 12) })),
    }
    const written = await writeNullabilityResults(path, again)
    expect(written.keptEarlierBlocks).toEqual([])
    expect(
      parseManifestYaml(await readFile(path, 'utf-8')).resources['Note']?.nullabilityProbe
        ?.itemsRead
    ).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// Committed manifests
// ---------------------------------------------------------------------------

const OBSERVED_AT = '2026-11-01T09:00:00.000Z'

/** Probe evidence for a committed-manifest regression, as the merge writes it. */
function probeEvidence(
  bundleId: string,
  appVersion: string,
  sampleSize: number,
  nullCount: number
) {
  return {
    source: 'probe',
    observedAt: OBSERVED_AT,
    bundleId,
    appVersion,
    osVersion: '27.2',
    sampleSize,
    nullCount,
    failedReads: 0,
  } as const
}

/** A merge outcome that sets (or refreshes) a probe claim. */
function claimOutcome(
  property: string,
  change: 'set' | 'refreshed',
  evidence: ReturnType<typeof probeEvidence>
): PropertyMergeOutcome {
  return {
    property,
    presence: { reads: evidence.sampleSize, nulls: evidence.nullCount, failures: 0 },
    observation: evidence.nullCount > 0 ? 'nullable' : 'non-null',
    change,
    claim: { nullable: evidence.nullCount > 0, evidence },
  }
}

/**
 * The 0-based line numbers the node at each `path` spans in `text`, from the
 * start of its value to the end of its value.
 */
function nodeLines(text: string, paths: readonly (readonly string[])[]): Set<number> {
  const doc = parseDocument(text)
  const lineOf = (offset: number): number => text.slice(0, offset).split('\n').length - 1
  const lines = new Set<number>()
  for (const path of paths) {
    const node = doc.getIn(path, true)
    if (!isNode(node) || node.range === undefined || node.range === null) continue
    for (let line = lineOf(node.range[0]); line <= lineOf(node.range[1] - 1); line++) {
      lines.add(line)
    }
  }
  return lines
}

/** The source text of each curated nullability claim's property in `text`, by path. */
function curatedClaimTexts(text: string): Map<string, string> {
  const manifest = parseManifestYaml(text)
  const doc = parseDocument(text)
  const texts = new Map<string, string>()
  for (const [resourceKey, resource] of Object.entries(manifest.resources)) {
    for (const [property, definition] of Object.entries(resource.properties)) {
      if (definition.evidence?.nullable?.source !== 'curated') continue
      const node = doc.getIn(['resources', resourceKey, 'properties', property], true)
      if (!isNode(node) || node.range === undefined || node.range === null) continue
      texts.set(`${resourceKey}.${property}`, text.slice(node.range[0], node.range[1]))
    }
  }
  return texts
}

describe('writeNullabilityResults on committed manifests (regression)', () => {
  it('on TextEdit, which has no evidence, inserts only the claims and the block', async () => {
    const path = join(dir, 'app.yaml')
    await copyFile(join(MANIFESTS_DIR, 'textedit', 'app.yaml'), path)
    const before = await readFile(path, 'utf-8')
    expect(before).not.toContain('evidence:')

    const pathClaim = probeEvidence('com.apple.TextEdit', '1.20', 40, 2)
    const modifiedClaim = probeEvidence('com.apple.TextEdit', '1.20', 40, 0)
    await writeNullabilityResults(path, {
      bundleId: 'com.apple.TextEdit',
      appName: 'TextEdit',
      resources: [
        {
          resource: 'Document',
          block: {
            observedAt: OBSERVED_AT,
            bundleId: 'com.apple.TextEdit',
            appVersion: '1.20',
            osVersion: '27.2',
            accessPath: 'documents',
            itemsRead: 40,
            sampledParents: 1,
            status: 'probed',
            skipped: ['text'],
          },
          properties: [
            claimOutcome('path', 'set', pathClaim),
            claimOutcome('modified', 'set', modifiedClaim),
          ],
        },
      ],
    })
    const after = await readFile(path, 'utf-8')

    // Hand-written: each claim is appended to its property, and the block to
    // the resource, after its last property.
    expect(insertedRuns(before, after)).toEqual([
      [
        '        nullable: true',
        '        evidence:',
        '          nullable:',
        '            source: probe',
        "            observedAt: '2026-11-01T09:00:00.000Z'",
        '            bundleId: com.apple.TextEdit',
        "            appVersion: '1.20'",
        "            osVersion: '27.2'",
        '            sampleSize: 40',
        '            nullCount: 2',
        '            failedReads: 0',
      ],
      [
        '        nullable: false',
        '        evidence:',
        '          nullable:',
        '            source: probe',
        "            observedAt: '2026-11-01T09:00:00.000Z'",
        '            bundleId: com.apple.TextEdit',
        "            appVersion: '1.20'",
        "            osVersion: '27.2'",
        '            sampleSize: 40',
        '            nullCount: 0',
        '            failedReads: 0',
      ],
      [
        '    nullabilityProbe:',
        "      observedAt: '2026-11-01T09:00:00.000Z'",
        '      bundleId: com.apple.TextEdit',
        "      appVersion: '1.20'",
        "      osVersion: '27.2'",
        '      accessPath: documents',
        '      itemsRead: 40',
        '      sampledParents: 1',
        '      status: probed',
        '      skipped:',
        '        - text',
      ],
    ])
    const document = parseManifestYaml(after).resources['Document']
    expect(document?.properties['path']).toMatchObject({
      nullable: true,
      evidence: { nullable: pathClaim },
    })
    expect(document?.properties['modified']).toMatchObject({
      nullable: false,
      evidence: { nullable: modifiedClaim },
    })
  })

  it('on Reminders, which carries evidence, changes only the edited claims and block', async () => {
    const path = join(dir, 'app.yaml')
    await copyFile(join(MANIFESTS_DIR, 'reminders', 'app.yaml'), path)
    const before = await readFile(path, 'utf-8')
    const reminder = parseManifestYaml(before).resources['Reminder']
    // The fixture's premises: priority has a probe non-null claim to refresh,
    // allDayDueDate has no claim yet, and some claims are curated.
    expect(reminder?.properties['priority']?.evidence?.nullable?.source).toBe('probe')
    expect(reminder?.properties['allDayDueDate']?.nullable).toBeUndefined()
    const curated = curatedClaimTexts(before)
    expect(curated.size).toBeGreaterThan(0)

    const refreshed = probeEvidence('com.apple.reminders', '7.0', 60, 0)
    const inserted = probeEvidence('com.apple.reminders', '7.0', 60, 9)
    const block: NullabilityProbe = {
      observedAt: OBSERVED_AT,
      bundleId: 'com.apple.reminders',
      appVersion: '7.0',
      osVersion: '27.2',
      accessPath: 'lists/reminders',
      itemsRead: 60,
      sampledParents: 3,
      status: 'probed',
      skipped: ['body'],
    }
    await writeNullabilityResults(path, {
      bundleId: 'com.apple.reminders',
      appName: 'Reminders',
      resources: [
        {
          resource: 'Reminder',
          block,
          properties: [
            claimOutcome('priority', 'refreshed', refreshed),
            claimOutcome('allDayDueDate', 'set', inserted),
          ],
        },
      ],
    })
    const after = await readFile(path, 'utf-8')

    // Every line outside the edited nodes survives, unchanged and in order.
    const reminderPath = ['resources', 'Reminder']
    const edited = nodeLines(before, [
      [...reminderPath, 'properties', 'priority', 'nullable'],
      [...reminderPath, 'properties', 'priority', 'evidence', 'nullable'],
      [...reminderPath, 'nullabilityProbe'],
    ])
    const untouched = before
      .split('\n')
      .filter((_, line) => !edited.has(line))
      .join('\n')
    insertedRuns(untouched, after)

    // Curated claims are byte for byte as they were.
    expect(curatedClaimTexts(after)).toEqual(curated)

    // The edited nodes parse to the claims and the block written.
    const written = parseManifestYaml(after).resources['Reminder']
    expect(written?.properties['priority']).toMatchObject({
      nullable: false,
      evidence: { nullable: refreshed },
    })
    expect(written?.properties['allDayDueDate']).toMatchObject({
      nullable: true,
      evidence: { nullable: inserted },
    })
    expect(written?.nullabilityProbe).toEqual(block)
  })
})
