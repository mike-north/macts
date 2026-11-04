/**
 * Writing probe results back into a manifest file, preserving its format.
 *
 * Manifests are hand-maintained YAML: their comments, blank lines, key order,
 * and quoting carry meaning for the people who edit them. The writers here
 * edit the parsed document in place (`yaml`'s `parseDocument` with
 * `setIn`/`getIn`), so every line outside the blocks they write stays byte
 * for byte as it was. Each writer validates the edited manifest before
 * writing it, and leaves the file untouched if the result would not load.
 *
 * Two writers share this module:
 *
 * - {@link writeProbeResults} records the identifier probe's
 *   `resources.<R>.probe` blocks.
 * - {@link writeNullabilityResults} records the nullability probe's
 *   per-property `nullable` and `evidence.nullable` claims and each
 *   resource's `nullabilityProbe` block.
 *
 * Neither touches anything else: sdef-declared identifiers, other evidence
 * (resettability in particular), and curated claims the probe did not
 * contradict all survive.
 *
 * @packageDocumentation
 */

import { readFile, writeFile } from 'node:fs/promises'
import * as jsYaml from 'js-yaml'
import { isMap, isScalar, parseDocument, visit, type Document, type Node } from 'yaml'
import { parseManifestYaml } from '../manifest/loader.js'
import type { NullabilityMergeResult } from './nullability-merge.js'
import type { AppProbeResult } from './probe.js'

/**
 * Whether the manifest loader would read `text`, written as a plain
 * (unquoted) YAML scalar, back as exactly that string. The loader reads YAML
 * 1.1, where plain timestamps, numbers, and words like `yes` are not strings,
 * so such text must be quoted.
 */
function readsBackAsString(text: string): boolean {
  try {
    return jsYaml.load(text) === text
  } catch {
    return false
  }
}

/**
 * The YAML node for `value`, with every string the manifest loader would not
 * read back as a string single-quoted (the manifests' own quoting style).
 */
function createNode(doc: Document, value: unknown): Node {
  const node = doc.createNode(value)
  visit(node, {
    Scalar(_key, scalar) {
      if (typeof scalar.value === 'string' && !readsBackAsString(scalar.value)) {
        scalar.type = 'QUOTE_SINGLE'
      }
    },
  })
  return node
}

/**
 * Read the manifest at `manifestPath`, apply `edit` to its document, check
 * that the result still loads as a manifest, and write it back.
 *
 * @throws When the file does not parse as a YAML mapping, or the edited
 *   manifest would not load; the file is left untouched.
 */
async function editManifest(manifestPath: string, edit: (doc: Document) => void): Promise<void> {
  const content = await readFile(manifestPath, 'utf-8')
  const doc = parseDocument(content)
  if (doc.errors.length > 0 || !isMap(doc.contents)) {
    throw new Error(`Manifest at ${manifestPath} did not parse to a plain object`)
  }
  edit(doc)
  // lineWidth 0: never fold long lines, so untouched lines keep their layout.
  const updated = doc.toString({ lineWidth: 0 })
  try {
    parseManifestYaml(updated)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Refusing to write ${manifestPath}: the result would not load. ${reason}`)
  }
  await writeFile(manifestPath, updated, 'utf-8')
}

/** Whether the document has a mapping at `resources.<resourceKey>`. */
function hasResource(doc: Document, resourceKey: string): boolean {
  return isMap(doc.getIn(['resources', resourceKey]))
}

/**
 * Merge the identifier probe's results into the manifest at `manifestPath`.
 *
 * Each probed resource's `probe` block is replaced under
 * `resources.<Name>.probe`. The sdef-declared `identifiers` array is not
 * touched — probe metadata is purely additive — and neither is any other line
 * of the file.
 *
 * @param manifestPath - Absolute path to the `app.yaml` manifest file
 * @param result       - Probe result produced by `probeManifest`
 */
export async function writeProbeResults(
  manifestPath: string,
  result: AppProbeResult
): Promise<void> {
  await editManifest(manifestPath, (doc) => {
    for (const [resourceName, r] of Object.entries(result.resources)) {
      // A resource missing from the file, or malformed in it, is skipped
      // rather than blocking the others.
      if (!hasResource(doc, resourceName)) continue
      // A compact probe block: only fields that have values.
      const probeBlock: Record<string, string> = { status: r.probe.status }
      if (r.probe.runtimeIdentifier !== undefined) {
        probeBlock['runtimeIdentifier'] = r.probe.runtimeIdentifier
      }
      if (r.probe.probedAt !== undefined) probeBlock['probedAt'] = r.probe.probedAt
      if (r.probe.note !== undefined) probeBlock['note'] = r.probe.note
      doc.setIn(['resources', resourceName, 'probe'], createNode(doc, probeBlock))
    }
  })
}

/**
 * Apply a nullability probe's merged decisions to the manifest at
 * `manifestPath`.
 *
 * For each resource it upserts the `nullabilityProbe` block, and for each
 * property whose claim the merge sets or refreshes it upserts `nullable` and
 * `evidence.nullable`: on the property's declaration, or, for a property the
 * resource inherits from a superclass (D10, "Superclasses"), in a
 * claims-only overlay, `inheritedClaims.<property>`, so the claim is the
 * resource's own and the declaration stays the superclass's. Nothing else
 * changes: `evidence.resettable`, claims the merge left unchanged, and every
 * other line keep their text. A claim with nowhere to go (the resource
 * neither declares nor inherits the property, or its evidence is not a
 * mapping) is not written, and is reported in `notWritten`.
 *
 * A resource whose new probe read no item (out of time, unreachable, failed,
 * or empty) keeps an earlier `nullabilityProbe` block that did read items:
 * that block describes the sample the resource's probe claims came from, and
 * a probe that saw nothing must not erase that record.
 *
 * @param manifestPath - Absolute path to the `app.yaml` manifest file
 * @param merged       - Decisions produced by `mergeNullabilityObservations`
 * @returns What was written, including the resources whose earlier block was kept.
 */
export async function writeNullabilityResults(
  manifestPath: string,
  merged: NullabilityMergeResult
): Promise<NullabilityWriteResult> {
  const keptEarlierBlocks: string[] = []
  const notWritten: NotWrittenClaim[] = []
  await editManifest(manifestPath, (doc) => {
    for (const resource of merged.resources) {
      if (!hasResource(doc, resource.resource)) continue
      for (const outcome of resource.properties) {
        if (outcome.claim === undefined || outcome.change === 'unchanged') continue
        const { resource: key } = resource
        const { property } = outcome
        const path = claimPath(doc, key, property)
        if (path === undefined) {
          notWritten.push({ resource: key, property, reason: 'not-declared' })
          continue
        }
        const evidence: unknown = doc.getIn([...path, 'evidence'])
        if (
          evidence !== undefined &&
          !isMap(evidence) &&
          !(isScalar(evidence) && evidence.value === null)
        ) {
          notWritten.push({ resource: key, property, reason: 'evidence-not-mapping' })
          continue
        }
        doc.setIn([...path, 'nullable'], outcome.claim.nullable)
        doc.setIn([...path, 'evidence', 'nullable'], createNode(doc, outcome.claim.evidence))
      }
      const blockPath = ['resources', resource.resource, 'nullabilityProbe']
      if (resource.block.itemsRead === 0 && earlierItemsRead(doc.getIn(blockPath)) > 0) {
        keptEarlierBlocks.push(resource.resource)
        continue
      }
      doc.setIn(blockPath, createNode(doc, resource.block))
    }
  })
  return { keptEarlierBlocks, notWritten }
}

/**
 * Where a claim about `property` of `resourceKey` is written: the property's
 * declaration, when the resource declares it; the resource's claims-only
 * overlay for it, when the resource inherits it from a superclass; or
 * `undefined`, when it does neither.
 */
function claimPath(
  doc: Document,
  resourceKey: string,
  property: string
): (string | number)[] | undefined {
  const declared = ['resources', resourceKey, 'properties', property]
  if (isMap(doc.getIn(declared))) return declared
  if (doc.getIn(declared) !== undefined) return undefined
  const seen = new Set([resourceKey])
  let superclass: unknown = doc.getIn(['resources', resourceKey, 'inherits', 'resource'])
  while (typeof superclass === 'string' && !seen.has(superclass)) {
    if (isMap(doc.getIn(['resources', superclass, 'properties', property]))) {
      return ['resources', resourceKey, 'inheritedClaims', property]
    }
    seen.add(superclass)
    superclass = doc.getIn(['resources', superclass, 'inherits', 'resource'])
  }
  return undefined
}

/** A claim the probe decided on and {@link writeNullabilityResults} did not write. */
export interface NotWrittenClaim {
  /** The manifest key of the resource. */
  readonly resource: string
  /** The property the claim is about. */
  readonly property: string
  /**
   * Why it has nowhere to go: `not-declared`, the resource neither declares
   * nor inherits the property; `evidence-not-mapping`, the property's (or its
   * overlay's) `evidence` is not a mapping, so a claim cannot be added to it.
   */
  readonly reason: 'not-declared' | 'evidence-not-mapping'
}

/** What {@link writeNullabilityResults} wrote. */
export interface NullabilityWriteResult {
  /**
   * Resources whose new probe read no item, and whose earlier
   * `nullabilityProbe` block (which did read items) was kept, in merge order.
   */
  readonly keptEarlierBlocks: readonly string[]
  /**
   * Claims the merge set or refreshed that were not written, in merge order:
   * the resource neither declares nor inherits the property, or the
   * property's `evidence` is not a mapping.
   */
  readonly notWritten: readonly NotWrittenClaim[]
}

/** The `itemsRead` of an existing `nullabilityProbe` block node, or 0. */
function earlierItemsRead(block: unknown): number {
  if (!isMap(block)) return 0
  const itemsRead: unknown = block.get('itemsRead')
  return typeof itemsRead === 'number' ? itemsRead : 0
}
