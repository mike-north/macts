/**
 * LOCALLY-AUTOMATABLE, read-only measurement of what a page costs, both ways a
 * page can be read, for every list that pages in the shipped manifests. NOT
 * run in CI, and not part of the normal live suite.
 *
 * ## What this measures
 *
 * A list that pages records how its pages are read, `rangeRead.read: range`
 * or `column`, and the measured cost that choice rests on, `evidence.cost`
 * (see `PageCostSchema` and `pageReadFor` in the manifest schema). This tool
 * produces that cost, so the evidence can be measured again, on another
 * machine, another app build, or a collection that has grown:
 *
 * - For each list that pages, it reads the first page at the default page
 *   size by range and by column, `runs` times each, interleaved and
 *   alternating which read goes first, so that load on the machine affects
 *   both alike. Each time is the median of its runs.
 * - It times the unpaged whole list too, for comparison only; that time is
 *   printed, not recorded.
 * - A list under a parent is read under the parent with the most items of
 *   that list, chosen through the parent's own list operation and a one-item
 *   page of the child list under each parent, whose result gives the child
 *   collection's length.
 *
 * Every read goes through the real native executor and list body, exactly as
 * the runtime makes it. The page read is forced by overriding `read` on an
 * in-memory copy of the shipped manifest; nothing on disk changes.
 *
 * It prints a table and, per list, the `cost` values to record with the read
 * they choose. Only timings, counts and list names are printed: never a
 * record's contents, a name or an identifier. Parent identifiers stay in
 * memory. Only list operations run, so nothing in any app is created, changed
 * or deleted.
 *
 * It asserts nothing about timings, only that every page read succeeds and
 * that both reads see a collection of the same length with a full page.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with the apps whose lists page.
 * - Requires automation permission (TCC) for the process running the tests,
 *   and access to the apps' data; the first run raises prompts only a person
 *   at the Mac can answer.
 * - It is slow by design: it reads every paged list many times.
 *
 * It is therefore gated behind both `MACTS_LIVE_APPS=1` and
 * `MACTS_PAGE_COST=1`, so the normal live suite stays fast.
 *
 * ## Local run procedure
 *
 * ```sh
 * pnpm --filter @macts/core build
 * MACTS_LIVE_APPS=1 MACTS_PAGE_COST=1 pnpm --filter @macts/core exec vitest run src/jxa/page-read-cost.live.test.ts
 * ```
 *
 * - `MACTS_PAGE_COST_RUNS`: how many times each page is read each way (default 5).
 * - `MACTS_PAGE_COST_LISTS`: a comma-separated list of names to measure, such
 *   as `reminders.lists.list`; every list that pages when unset.
 *
 * Record the printed `cost` block and `read` in the list's resource marker in
 * `manifests/<app>/app.yaml`, then run `pnpm generate`.
 *
 * @see ../manifest/schemas/evidence.ts (PageCostSchema)
 * @see ../manifest/schemas/resource.ts (ResourceRangeReadSchema, pageReadFor)
 * @see ../../../../manifests/README.md (Range reads)
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D10, page read chosen per resource)
 */

import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  EMPTY_RESOURCE_PLAN_TABLE,
  PAGE_SIZE_LIMITS,
  PASSTHROUGH_PLAN,
  type OperationTarget,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import type { PageWindow, PageWindowResult } from '../execution/executor.js'
import { listOperationPages, resolvePrimaryIdentifierProperty } from '../manifest/identifier.js'
import { loadManifest } from '../manifest/loader.js'
import { normalizeResourceRouteSegment } from '../manifest/route.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { PAGE_READS, pageReadFor, type PageRead } from '../manifest/schemas/resource.js'
import { createNativeExecutor } from './native-executor.js'

const enabled = process.env['MACTS_LIVE_APPS'] === '1' && process.env['MACTS_PAGE_COST'] === '1'

/** How many times each page is read each way; each recorded time is their median. */
const RUNS = positiveInteger(process.env['MACTS_PAGE_COST_RUNS'], 5)

/** The lists to measure, by name; every list that pages when empty. */
const ONLY = (process.env['MACTS_PAGE_COST_LISTS'] ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter((name) => name !== '')

/** The page size timed: the default, the page a caller gets without asking. */
const PAGE_SIZE = PAGE_SIZE_LIMITS.default

/** How many times the unpaged whole list is timed; its time is for comparison only. */
const WHOLE_RUNS = Math.min(RUNS, 3)

/** Per-read limit: a column page of a large, slow collection takes a while. */
const OPERATION_TIMEOUT_MS = 300_000

/**
 * Limit for the whole measurement: every run of both reads, the whole lists,
 * and the parent scans, for every list that pages.
 */
const MEASUREMENT_TIMEOUT_MS = 6 * 3_600_000

const MANIFESTS_DIR = fileURLToPath(new URL('../../../../manifests/', import.meta.url))

function positiveInteger(text: string | undefined, fallback: number): number {
  if (text === undefined || text === '') return fallback
  const value = Number(text)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`MACTS_PAGE_COST_RUNS must be a whole number of at least 1, not ${text}`)
  }
  return value
}

/** A list that pages, and how to read it. */
interface PagedList {
  /** `<app>.<resources>.list`, as the capability listing names it. */
  readonly name: string
  readonly manifest: AppManifest
  /** The resource key whose marker records the page read. */
  readonly resourceKey: string
  readonly target: OperationTarget
  /** The list under its parent, when it has one. */
  readonly parent?: {
    /** The parameter naming the parent item. */
    readonly parameter: string
    /** The parent resource's own list, which has no parent. */
    readonly target: OperationTarget
    /** The field of a listed parent record holding its identifier. */
    readonly idKey: string
  }
}

/** Every list that pages in the shipped manifests, in name order. */
async function pagedLists(): Promise<PagedList[]> {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  const lists: PagedList[] = []
  for (const entry of entries.filter((e) => e.isDirectory())) {
    const manifest = await loadManifest(`${MANIFESTS_DIR}${entry.name}/app.yaml`)
    for (const [command, definition] of Object.entries(manifest.commands)) {
      // A list returns one resource; a command over several returns no list that pages.
      const resourceKey = definition.resourceType
      if (typeof resourceKey !== 'string') continue
      const resource = manifest.resources[resourceKey]
      if (resource === undefined) continue
      if (!listOperationPages(definition, resource)) continue
      const name = `${entry.name}.${normalizeResourceRouteSegment(resource.plural)}.list`
      const target = { command, resource: resourceKey }
      const parent = definition.parent
      if (parent === undefined) {
        lists.push({ name, manifest, resourceKey, target })
        continue
      }
      const parentList = Object.entries(manifest.commands).find(
        ([, c]) =>
          c.scope === 'resource' &&
          c.name === 'list' &&
          c.resourceType === parent.resource &&
          c.parent === undefined
      )
      const idKey = resolvePrimaryIdentifierProperty(manifest.resources[parent.resource])
      if (parentList === undefined || idKey === undefined) {
        throw new Error(`${name}: its parent ${parent.resource} has no top-level list to pick from`)
      }
      lists.push({
        name,
        manifest,
        resourceKey,
        target,
        parent: {
          parameter: parent.parameter,
          target: { command: parentList[0], resource: parent.resource },
          idKey,
        },
      })
    }
  }
  return lists.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

/**
 * An in-memory copy of `manifest` whose resource `resourceKey` reads its pages
 * by `read`. Only `read` changes; the executor reads nothing else of the cost.
 */
function reading(manifest: AppManifest, resourceKey: string, read: PageRead): AppManifest {
  const copy = structuredClone(manifest)
  const marker = copy.resources[resourceKey]?.rangeRead
  if (marker?.supported !== true) throw new Error(`${resourceKey} does not page`)
  marker.read = read
  return copy
}

function isWireRecord(value: WireValue | undefined): value is WireRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWindow(value: WireValue): value is WireRecord & PageWindowResult {
  return isWireRecord(value) && Array.isArray(value['items']) && typeof value['length'] === 'number'
}

/**
 * A failure described by its error class, code and app error number only, so
 * that a message quoting the app's data is never printed.
 */
function described(what: string, error: unknown): Error {
  if (typeof error !== 'object' || error === null) return new Error(`${what} failed`)
  const code = 'code' in error ? String(error.code) : 'no code'
  const details = 'details' in error ? error.details : undefined
  const appError =
    typeof details === 'object' && details !== null && 'appErrorCode' in details
      ? `, app error ${String(details.appErrorCode)}`
      : ''
  return new Error(`${what} failed with ${error.constructor.name} (${code}${appError})`)
}

const executor = createNativeExecutor({ timeoutMs: OPERATION_TIMEOUT_MS })

/** Run one list read, with a window or whole, and give its result and time. */
async function timed(
  what: string,
  manifest: AppManifest,
  target: OperationTarget,
  input: WireRecord,
  page?: PageWindow
): Promise<{ readonly result: WireValue; readonly ms: number }> {
  const started = performance.now()
  try {
    const result = await executor.execute({
      manifest,
      target,
      input,
      inputPlan: PASSTHROUGH_PLAN,
      outputPlan: PASSTHROUGH_PLAN,
      resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
      ...(page === undefined ? {} : { page }),
    })
    return { result, ms: Math.round(performance.now() - started) }
  } catch (error) {
    throw described(what, error)
  }
}

/** Read one page and give its window and time. */
async function timedPage(
  what: string,
  manifest: AppManifest,
  target: OperationTarget,
  input: WireRecord,
  size: number
): Promise<{ readonly window: PageWindowResult; readonly ms: number }> {
  const { result, ms } = await timed(what, manifest, target, input, { offset: 0, size })
  if (!isWindow(result)) throw new Error(`${what} did not return a page window`)
  return { window: result, ms }
}

/**
 * The input that reads `list` under its parent with the most items of it, and
 * how many parents there were; an empty input for a list with no parent.
 */
async function largestParentInput(
  list: PagedList
): Promise<{ readonly input: WireRecord; readonly parents?: number }> {
  if (list.parent === undefined) return { input: {} }
  const { parameter, target, idKey } = list.parent
  const { result } = await timed(`${list.name}: listing parents`, list.manifest, target, {})
  if (!Array.isArray(result)) throw new Error(`${list.name}: the parent list gave no array`)
  const listed: readonly WireValue[] = result
  let best: { id: string | number; length: number } | undefined
  for (const parent of listed) {
    const id = isWireRecord(parent) ? parent[idKey] : undefined
    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new Error(`${list.name}: a listed parent has no identifier in ${idKey}`)
    }
    const { window } = await timedPage(
      `${list.name}: sizing a parent`,
      list.manifest,
      list.target,
      { [parameter]: id },
      1
    )
    if (best === undefined || window.length > best.length) best = { id, length: window.length }
  }
  if (best === undefined) throw new Error(`${list.name}: there is no parent to read under`)
  return { input: { [parameter]: best.id }, parents: listed.length }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle] ?? 0
  return sorted.length % 2 === 1 ? upper : Math.round(((sorted[middle - 1] ?? 0) + upper) / 2)
}

/** What measuring one list found: timings and counts only. */
interface Measurement {
  readonly name: string
  readonly observedAt: string
  readonly items: number
  readonly pageMs: number
  readonly columnMs: number
  readonly read: PageRead
  readonly wholeMs: number
  readonly runs: Readonly<Record<PageRead, readonly number[]>>
  readonly parents?: number
}

/** The current time as an ISO 8601 UTC timestamp, to the second. */
function now(): string {
  return new Date(Math.floor(Date.now() / 1000) * 1000).toISOString()
}

async function measure(list: PagedList): Promise<Measurement> {
  const { input, parents } = await largestParentInput(list)
  const manifests: Record<PageRead, AppManifest> = {
    range: reading(list.manifest, list.resourceKey, 'range'),
    column: reading(list.manifest, list.resourceKey, 'column'),
  }
  const runs: Record<PageRead, number[]> = { range: [], column: [] }
  let items = 0
  for (let run = 0; run < RUNS; run++) {
    const order = run % 2 === 0 ? PAGE_READS : [...PAGE_READS].reverse()
    const lengths: number[] = []
    for (const read of order) {
      const what = `${list.name}: a page read by ${read}`
      const { window, ms } = await timedPage(what, manifests[read], list.target, input, PAGE_SIZE)
      expect(window.items.length, `${what}: a full page`).toBe(Math.min(PAGE_SIZE, window.length))
      runs[read].push(ms)
      lengths.push(window.length)
    }
    expect(new Set(lengths).size, `${list.name}: both reads see one collection length`).toBe(1)
    items = lengths[0] ?? 0
  }
  const whole: number[] = []
  for (let run = 0; run < WHOLE_RUNS; run++) {
    const what = `${list.name}: the whole list`
    whole.push((await timed(what, list.manifest, list.target, input)).ms)
  }
  const pageMs = median(runs.range)
  const columnMs = median(runs.column)
  return {
    name: list.name,
    observedAt: now(),
    items,
    pageMs,
    columnMs,
    read: pageReadFor(pageMs, columnMs),
    wholeMs: median(whole),
    runs,
    ...(parents === undefined ? {} : { parents }),
  }
}

/** The printed table, then each list's `cost` block to record and the read it chooses. */
function report(measurements: readonly Measurement[]): string {
  const header = ['list', 'items', 'pageMs', 'columnMs', 'ratio', 'read', 'wholeMs', 'parent']
  const rows = measurements.map((m) => [
    m.name,
    String(m.items),
    String(m.pageMs),
    String(m.columnMs),
    m.pageMs === 0 ? '-' : (m.columnMs / m.pageMs).toFixed(3),
    m.read,
    String(m.wholeMs),
    m.parents === undefined ? '' : `largest of ${String(m.parents)}`,
  ])
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => (row[i] ?? '').length))
  )
  const line = (cells: readonly string[]): string =>
    cells
      .map((cell, i) => cell.padEnd(widths[i] ?? 0))
      .join('  ')
      .trimEnd()
  const blocks = measurements.map((m) =>
    [
      `${m.name}: read: ${m.read}`,
      `  # runs by range ${m.runs.range.join(', ')}; by column ${m.runs.column.join(', ')}`,
      '  cost:',
      `    observedAt: '${m.observedAt}'`,
      `    pageMs: ${String(m.pageMs)}`,
      `    columnMs: ${String(m.columnMs)}`,
      `    items: ${String(m.items)}`,
      `    runs: ${String(RUNS)}`,
      `    pageSize: ${String(PAGE_SIZE)}`,
    ].join('\n')
  )
  return [
    `Page cost: first page of ${String(PAGE_SIZE)}, median of ${String(RUNS)} interleaved runs each way.`,
    line(header),
    ...rows.map(line),
    '',
    ...blocks,
  ].join('\n')
}

describe.skipIf(!enabled)('what a page costs, read by range and by column (local only)', () => {
  let lists: PagedList[] = []
  const measurements: Measurement[] = []

  beforeAll(async () => {
    const all = await pagedLists()
    const unknown = ONLY.filter((name) => !all.some((list) => list.name === name))
    if (unknown.length > 0) {
      throw new Error(`MACTS_PAGE_COST_LISTS names lists that do not page: ${unknown.join(', ')}`)
    }
    lists = ONLY.length === 0 ? all : all.filter((list) => ONLY.includes(list.name))
  })

  afterAll(() => {
    if (measurements.length > 0) console.log(report(measurements))
  })

  it(
    'reads the first page of every list that pages, both ways',
    async () => {
      expect(lists.length, 'lists to measure').toBeGreaterThan(0)
      for (const list of lists) {
        const measurement = await measure(list)
        measurements.push(measurement)
        console.log(
          `${measurement.name}: ${String(measurement.items)} items, ${String(measurement.pageMs)} ms by range, ${String(measurement.columnMs)} ms by column (${measurement.read})`
        )
      }
    },
    MEASUREMENT_TIMEOUT_MS
  )
})
