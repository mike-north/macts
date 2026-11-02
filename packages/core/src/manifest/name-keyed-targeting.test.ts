/**
 * Guard: a resource keyed by `name` declares how it is targeted.
 *
 * A resource whose primary identifier is `name` and that declares no
 * `targeting` is addressed by the default lookup, the app's `id` specifier. A
 * native body for one of its items then looks the item up by its name as if it
 * were an id, which finds nothing in an app whose class has no `id` property
 * (Notes' `get` on a note addressed `notes.byId(<name>)`).
 *
 * This suite fails when, in any shipped manifest, a usable resource has a
 * primary identifier named `name` and does not declare `targeting:
 * byProperty`. The fix is one of two, decided from the app's dictionary:
 *
 * - the class has a real `id`: make `id` the primary identifier;
 * - the class has no `id`: keep `name` and declare `targeting: byProperty`,
 *   with a manifest comment citing the dictionary.
 *
 * An explicit `targeting: byId` on `name` is the same defect declared, so it
 * is flagged too. A resource marked unsupported is on no surface and is not
 * checked.
 *
 * The only way out is {@link UNRESOLVED_NAME_KEYED}: resources whose fix
 * cannot be decided from a dictionary on this machine. The list is exact: an
 * entry that no longer violates the rule fails the suite until it is removed.
 *
 * Regression: Notes' accounts, folders and notes, TextEdit, Preview, Script
 * Editor and System Information documents, Terminal's windows and settings
 * sets, and Xcode's file, text and source documents, build settings, resolved
 * build settings and run destinations were all keyed by `name` with no
 * targeting (#194).
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10 (identifier targeting)
 * @see https://github.com/mike-north/macts/issues/194
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { resolveIdentifierTargeting, resolvePrimaryIdentifierProperty } from './identifier.js'
import { loadManifest } from './loader.js'
import type { AppManifest } from './schemas/index.js'
import { usableResources } from './unsupported.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/**
 * Name-keyed resources that declare no targeting, as `'<app>: <ResourceKey>'`,
 * each with why it is not yet resolved.
 */
const UNRESOLVED_NAME_KEYED: ReadonlyMap<string, string> = new Map([
  [
    'alfred: Application',
    'The application itself, not a collection item: the hierarchy has no entry for it and no resource command addresses it, so no lookup is ever built from its identifier.',
  ],
  [
    'bluetooth-file-exchange: Application',
    'The application itself, not a collection item: the hierarchy has no entry for it and no resource command addresses it, so no lookup is ever built from its identifier.',
  ],
  [
    'microsoft-word: Document',
    'Microsoft Word is not installed where the manifests are curated, so its dictionary cannot be read to tell whether a document has an `id`.',
  ],
  [
    'omnigraffle: Layer',
    'OmniGraffle is not installed where the manifests are curated, so its dictionary cannot be read to tell whether a layer has an `id`.',
  ],
])

/** The resources of `manifest` keyed by `name` that do not declare `byProperty`. */
function undeclaredNameKeyed(dir: string, manifest: AppManifest): string[] {
  return usableResources(manifest).flatMap(([key, resource]) => {
    if (resolvePrimaryIdentifierProperty(resource) !== 'name') return []
    return resolveIdentifierTargeting(resource)?.strategy === 'byProperty' ? [] : [`${dir}: ${key}`]
  })
}

let manifests: { dir: string; manifest: AppManifest }[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => ({
        dir: entry.name,
        manifest: await loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')),
      }))
  )
})

function shipped(dir: string): AppManifest {
  const found = manifests.find((entry) => entry.dir === dir)
  if (found === undefined) throw new Error(`no shipped manifest in ${dir}`)
  return found.manifest
}

describe('every name-keyed resource declares byProperty targeting (#194)', () => {
  it('loads every shipped manifest', () => {
    expect(manifests.length).toBeGreaterThan(0)
  })

  it('leaves only the unresolved resources without it', () => {
    const undeclared = manifests.flatMap(({ dir, manifest }) => undeclaredNameKeyed(dir, manifest))
    expect(undeclared.filter((id) => !UNRESOLVED_NAME_KEYED.has(id))).toEqual([])
  })

  it('lists exactly the resources still unresolved', () => {
    // An entry that now declares targeting, or is keyed by another property,
    // no longer needs the exception.
    const undeclared = new Set(
      manifests.flatMap(({ dir, manifest }) => undeclaredNameKeyed(dir, manifest))
    )
    expect([...UNRESOLVED_NAME_KEYED.keys()].filter((id) => !undeclared.has(id))).toEqual([])
  })

  it('gives every exception a reason', () => {
    expect([...UNRESOLVED_NAME_KEYED].filter(([, reason]) => reason.trim() === '')).toEqual([])
  })

  it('flags a name-keyed resource that loses its targeting', () => {
    // A detector that flags nothing would pass vacuously: Xcode's run
    // destination is keyed by `name` and declares byProperty, so dropping the
    // declaration must be caught.
    const xcode = shipped('xcode')
    const runDestination = xcode.resources['RunDestination']
    if (runDestination === undefined) throw new Error('Xcode declares no RunDestination')
    expect(undeclaredNameKeyed('xcode', xcode)).not.toContain('xcode: RunDestination')
    const stripped: AppManifest = {
      ...xcode,
      resources: {
        ...xcode.resources,
        RunDestination: {
          ...runDestination,
          identifiers: runDestination.identifiers?.map(
            ({ targeting: _targeting, ...identifier }) => identifier
          ),
        },
      },
    }
    expect(undeclaredNameKeyed('xcode', stripped)).toEqual(['xcode: RunDestination'])
  })

  it('flags a name-keyed resource that declares byId', () => {
    const xcode = shipped('xcode')
    const runDestination = xcode.resources['RunDestination']
    if (runDestination === undefined) throw new Error('Xcode declares no RunDestination')
    const byId: AppManifest = {
      ...xcode,
      resources: {
        ...xcode.resources,
        RunDestination: {
          ...runDestination,
          identifiers: runDestination.identifiers?.map((identifier) => ({
            ...identifier,
            targeting: 'byId',
          })),
        },
      },
    }
    expect(undeclaredNameKeyed('xcode', byId)).toEqual(['xcode: RunDestination'])
  })

  it('does not flag a resource keyed by id', () => {
    // Notes' notes are keyed by their dictionary `id`, which needs no targeting.
    expect(undeclaredNameKeyed('notes', shipped('notes'))).toEqual([])
  })
})
