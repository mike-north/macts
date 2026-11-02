/**
 * Guard: a command on a nested resource records its parent.
 *
 * A native body reaches a command's target through the parent the manifest
 * records for it (`command.parent`), and addresses the resource at the
 * application when it records none. Nothing guesses a parent any more, so a
 * command on a resource the application does not hold, with no recorded
 * parent, would address a collection the app does not have.
 *
 * This suite fails when, in any shipped manifest, a usable list, get, create,
 * update or delete command on a resource that the hierarchy nests under
 * another resource, and that is not also a top-level child of the hierarchy
 * (`usableHierarchyChildren` of `manifest.hierarchy.children`), records no
 * parent. Only those five command shapes address a collection; every other
 * command is called on the application with its parameters. A resource the
 * hierarchy does not place at all has no parent to record, and is not
 * checked. A recorded parent is always accepted here; the manifest schema
 * checks that it names a declared resource and a required parameter.
 *
 * The one exception is {@link AWAITING_PARENT_DESIGN}: nested commands whose
 * parent, or whether they need one, awaits a design decision. The list is
 * exact: an entry that records a parent, or whose resource becomes a
 * top-level child, fails the suite until it is removed.
 *
 * A recorded parent must also hold the command's resource in the hierarchy,
 * so the curated parent and the containment the manifest declares agree.
 *
 * Regression: Microsoft Edge's `listBookmarkItems`, Xcode's `listProjects`,
 * `listSchemes` and `listRunDestinations`, and Automator's `listActions`,
 * `listVariables`, `listSettings` and `listRequiredResources` took a parent
 * guessed from their parameter's name, and addressed `folders`,
 * `workspaceNames`, `workflowNames` and `actions`, which those apps do not
 * have.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10 (command parents)
 * @see https://github.com/mike-north/macts/issues/165
 * @see https://github.com/mike-north/macts/issues/173
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { isCrudName } from '../generator/surface.js'
import { loadManifest } from './loader.js'
import { resolveManifestRoutes } from './route.js'
import type { AppManifest, HierarchyChild } from './schemas/index.js'
import { usableHierarchyChildren } from './unsupported.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/**
 * Nested commands that record no parent while their design is open, as
 * `'<app>: <commandKey>'`.
 *
 * @see https://github.com/mike-north/macts/issues/173
 */
const AWAITING_PARENT_DESIGN: ReadonlySet<string> = new Set([
  'microsoft-edge: getTab',
  'microsoft-edge: getBookmarkItem',
  'omnigraffle: getGraphic',
  'omnigraffle: getShape',
  'omnigraffle: getLine',
  'omnigraffle: getLayer',
  'omniplan: listTasks',
  'omniplan: getTask',
  'omniplan: createTask',
  'omniplan: listMilestones',
  'omniplan: getMilestone',
  'omniplan: createMilestone',
  'omniplan: listResources',
  'omniplan: getResource',
  'omniplan: createResource',
  'omniplan: listAssignments',
  'omniplan: listDependencies',
  'omniplan: listViolations',
  'omniplan: listScenarios',
  'omniplan: getScenario',
  'xcode: getProject',
  'xcode: getScheme',
  'xcode: getRunDestination',
  'omnifocus: listTasks',
  'omnifocus: getTask',
  'omnifocus: createTask',
])

/** Every usable entry of a hierarchy, at any depth, with the resource holding it. */
interface PlacedEntry {
  /** The resource whose items hold the entry, or `undefined` at the application. */
  readonly holder: string | undefined
  readonly child: HierarchyChild
}

function placedEntries(manifest: AppManifest): PlacedEntry[] {
  const entries: PlacedEntry[] = []
  const walk = (children: Record<string, HierarchyChild>, holder: string | undefined): void => {
    for (const [, child] of usableHierarchyChildren(manifest, children)) {
      entries.push({ holder, child })
      if (child.children !== undefined) walk(child.children, child.resource)
    }
  }
  walk(manifest.hierarchy.children, undefined)
  return entries
}

/**
 * The resources the hierarchy nests under another resource and does not also
 * place at the application: their items exist only inside a parent.
 */
function nestedOnlyResources(manifest: AppManifest): Set<string> {
  const entries = placedEntries(manifest)
  const topLevel = new Set(
    entries.filter((entry) => entry.holder === undefined).map((entry) => entry.child.resource)
  )
  return new Set(
    entries
      .filter((entry) => entry.holder !== undefined && !topLevel.has(entry.child.resource))
      .map((entry) => entry.child.resource)
  )
}

/** One usable command and the resource it addresses, from a resolved route. */
interface AddressedCommand {
  readonly id: string
  readonly commandKey: string
  readonly resource: string
}

/** The usable CRUD-shaped commands of `manifest`, one entry per resource they address. */
function addressedCommands(dir: string, manifest: AppManifest): AddressedCommand[] {
  return resolveManifestRoutes(manifest).flatMap((route) =>
    route.resourceType === undefined || !isCrudName(route.command.name)
      ? []
      : [
          {
            id: `${dir}: ${route.commandKey}`,
            commandKey: route.commandKey,
            resource: route.resourceType,
          },
        ]
  )
}

/** The commands of `manifest` on a nested-only resource that record no parent. */
function parentlessNestedCommands(dir: string, manifest: AppManifest): string[] {
  const nested = nestedOnlyResources(manifest)
  const missing = new Set<string>()
  for (const { id, commandKey, resource } of addressedCommands(dir, manifest)) {
    if (!nested.has(resource)) continue
    if (manifest.commands[commandKey]?.parent === undefined) missing.add(id)
  }
  return [...missing]
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

describe('every command on a nested resource records its parent (#165)', () => {
  it('loads every shipped manifest', () => {
    expect(manifests.length).toBeGreaterThan(0)
  })

  it('leaves only the commands awaiting a parent design without one', () => {
    const missing = manifests.flatMap(({ dir, manifest }) =>
      parentlessNestedCommands(dir, manifest)
    )
    expect(missing.filter((id) => !AWAITING_PARENT_DESIGN.has(id))).toEqual([])
  })

  it('lists exactly the commands still awaiting a parent design', () => {
    // An entry that records a parent, or whose resource is now also a
    // top-level child, no longer needs the exception.
    const missing = new Set(
      manifests.flatMap(({ dir, manifest }) => parentlessNestedCommands(dir, manifest))
    )
    expect([...AWAITING_PARENT_DESIGN].filter((id) => !missing.has(id))).toEqual([])
  })

  it('places every recorded parent as a holder of the command’s resource in the hierarchy', () => {
    const mismatched: string[] = []
    for (const { dir, manifest } of manifests) {
      const holds = new Set(
        placedEntries(manifest).map((entry) => `${entry.holder ?? ''} > ${entry.child.resource}`)
      )
      for (const { id, commandKey, resource } of addressedCommands(dir, manifest)) {
        const parent = manifest.commands[commandKey]?.parent
        if (parent === undefined) continue
        if (!holds.has(`${parent.resource} > ${resource}`)) {
          mismatched.push(`${id}: ${parent.resource} does not hold ${resource}`)
        }
      }
    }
    expect(mismatched).toEqual([])
  })

  it('needs no parent on a resource that is also a top-level child', () => {
    // Reminders' reminders and Automator's actions and variables are elements
    // of the application as well as of a list or a workflow, so a command that
    // looks one up at the application is right without a parent.
    const reminders = parentlessNestedCommands('reminders', shipped('reminders'))
    expect(reminders).not.toContain('reminders: getReminder')
    expect(reminders).not.toContain('reminders: deleteReminder')
    const automator = parentlessNestedCommands('automator', shipped('automator'))
    expect(automator).not.toContain('automator: getAction')
    expect(automator).not.toContain('automator: getVariable')
  })

  it('flags a nested command that records no parent', () => {
    // A detector that flags nothing would pass vacuously: Calendar's events
    // exist only inside a calendar, so dropping getEvent's parent must be caught.
    const calendar = shipped('calendar')
    const getEvent = calendar.commands['getEvent']
    if (getEvent === undefined) throw new Error('Calendar declares no getEvent')
    const { parent: _parent, ...withoutParent } = getEvent
    void _parent
    const stripped: AppManifest = {
      ...calendar,
      commands: { ...calendar.commands, getEvent: withoutParent },
    }
    expect(parentlessNestedCommands('calendar', stripped)).toEqual(['calendar: getEvent'])
  })
})
