/** The reviewed diagnostic is inert source; VM adapters verify its privacy and ownership contract without opening an app. */
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { ITERM_METADATA_DIAGNOSTIC } from './test-support/iterm-metadata-diagnostic.js'

/** A closed fake dictionary surface: unknown members fail so tests cannot hide forbidden reads. */
function fixture(
  options: {
    running?: boolean
    failCreate?: number
    failClose?: boolean
    wrongOwner?: boolean
    concurrent?: boolean
    failRunning?: boolean
    failBaseline?: boolean
    failApplication?: boolean
    driftingHandle?: boolean
  } = {}
) {
  const calls: string[] = []
  let next = 10
  let creates = 0
  const rows: { id: number; tabs: object[]; selected: number }[] = [
    { id: 1, tabs: [], selected: 0 },
  ]
  const displays = new WeakMap<object, () => string>()
  let current = 1
  const closed = <T extends object>(object: T): T =>
    new Proxy(object, {
      get(target, key, receiver) {
        if (!Reflect.has(target, key)) throw new Error(`Forbidden member ${String(key)}`)
        return Reflect.get(target, key, receiver)
      },
    })
  function requiredRow(row: (typeof rows)[number] | undefined): (typeof rows)[number] {
    if (row === undefined) throw new Error('Missing fake window')
    return row
  }
  function tab(row: (typeof rows)[number]): object {
    const item = closed({ index: () => row.tabs.indexOf(item), owner: row.id })
    displays.set(
      item,
      () =>
        `Application("iTerm").windows.byId(${String(options.wrongOwner ? 999 : row.id)}).tabs.at(${String(row.tabs.indexOf(item))})`
    )
    row.tabs.push(item)
    row.selected = row.tabs.length - 1
    return item
  }
  function window(row: (typeof rows)[number]) {
    const tabs = Object.assign(() => row.tabs, { at: (index: number) => row.tabs[index] })
    Object.defineProperty(tabs, 'length', { get: () => row.tabs.length })
    return closed({
      id: () => row.id,
      tabs,
      currentTab: () => row.tabs[row.selected],
      bounds: () => [1, 2, 3, 4],
      frame: () => [1, 2, 3, 4],
      position: () => [1, 2],
      origin: () => {
        throw Object.assign(new Error('private error text'), { errorNumber: -10000 })
      },
      size: () => [3, 4],
    })
  }
  const windows = Object.assign(() => rows.map(window), {
    id: () => {
      if (options.failBaseline) throw new Error('private baseline text')
      return rows.map((row) => row.id)
    },
    byId: (id: number) => {
      const row = rows.find((row) => row.id === id)
      return row === undefined
        ? { exists: (): boolean => false }
        : { ...window(row), exists: (): boolean => true }
    },
  })
  const app = closed({
    windows,
    running: () => {
      if (options.failRunning) throw new Error('private running text')
      return options.running !== false
    },
    currentWindow: () => window(requiredRow(rows.find((row) => row.id === current) ?? rows[0])),
    createWindowWithDefaultProfile: () => {
      creates += 1
      if (creates === options.failCreate)
        throw Object.assign(new Error('private creation text'), { errorNumber: -10000 })
      const row = { id: next++, tabs: [], selected: 0 }
      rows.push(row)
      if (options.concurrent && creates === 1) rows.push({ id: 999, tabs: [], selected: 0 })
      tab(row)
      current = row.id
      calls.push(`create:${String(row.id)}`)
      return options.driftingHandle ? { id: () => current } : window(row)
    },
    createTabWithDefaultProfile: (owner: { id(): number }) => {
      const row = requiredRow(rows.find((row) => row.id === owner.id()))
      calls.push(`tab:${String(row.id)}`)
      return tab(row)
    },
    select: (item: object) => {
      const row = requiredRow(rows.find((row) => row.tabs.includes(item)))
      row.selected = row.tabs.indexOf(item)
      current = row.id
      calls.push('select')
    },
    close: (item: { id?: () => number }) => {
      if ('id' in item && typeof item.id === 'function') {
        const id = item.id()
        calls.push(`close:${String(id)}`)
        if (options.failClose)
          throw Object.assign(new Error('private close text'), { errorNumber: -10000 })
        rows.splice(
          rows.findIndex((row) => row.id === id),
          1
        )
      } else {
        const row = requiredRow(rows.find((row) => row.tabs.includes(item)))
        const at = row.tabs.indexOf(item)
        row.tabs.splice(at, 1)
        row.selected = Math.max(0, row.selected - (at <= row.selected ? 1 : 0))
        calls.push('close:tab')
      }
    },
  })
  return {
    calls,
    rows,
    run: () =>
      JSON.parse(
        String(
          runInNewContext(ITERM_METADATA_DIAGNOSTIC + '\nJSON.stringify(run())', {
            Application: () => {
              if (options.failApplication) throw new Error('private application text')
              return app
            },
            Automation: { getDisplayString: (item: object) => displays.get(item)?.() },
          })
        )
      ) as {
        completed: boolean
        cleanupComplete: boolean
        baselinePreserved: boolean
        errorNumber?: number
        checks: Record<string, boolean>
        shapes: unknown[]
      },
  }
}

describe('the inert iTerm metadata-only diagnostic', () => {
  it('reads metadata, proves second position and drift, and closes only its returned windows', () => {
    const app = fixture()
    const report = app.run()
    expect(report.completed).toBe(true)
    expect(Object.values(report.checks).every(Boolean)).toBe(true)
    expect(report.cleanupComplete).toBe(true)
    expect(report.baselinePreserved).toBe(true)
    expect(app.rows.map((row) => row.id)).toEqual([1])
    expect(app.calls).not.toContain('close:1')
    expect(JSON.stringify(report)).not.toContain('private')
    expect(JSON.stringify(report)).not.toContain('Application(')
  })
  it('refuses an app that is not already running without creating anything', () => {
    const app = fixture({ running: false })
    expect(app.run().completed).toBe(false)
    expect(app.calls).toEqual([])
  })
  it('cleans a proven owned window after partial setup fails', () => {
    const app = fixture({ failCreate: 2 })
    const report = app.run()
    expect(report.completed).toBe(false)
    expect(report.errorNumber).toBe(-10000)
    expect(report.cleanupComplete).toBe(false)
    expect(app.rows.map((row) => row.id)).toEqual([1])
  })
  it('reports cleanup failure without broadening cleanup to user windows or quitting', () => {
    const app = fixture({ failClose: true })
    const report = app.run()
    expect(report.cleanupComplete).toBe(false)
    expect(report.baselinePreserved).toBe(true)
    expect(app.calls).not.toContain('close:1')
    expect(JSON.stringify(report)).not.toContain('private')
  })
})

/** Concurrent user activity never becomes cleanup authority. */
describe('diagnostic ownership boundaries', () => {
  it('preserves a concurrently appearing unowned window', () => {
    const app = fixture({ concurrent: true })
    expect(app.run().cleanupComplete).toBe(true)
    expect(app.rows.map((row) => row.id)).toEqual([1, 999])
    expect(app.calls).not.toContain('close:999')
  })
  it('rejects a current-tab specifier naming a sibling container', () => {
    const app = fixture({ wrongOwner: true })
    const report = app.run()
    expect(report.completed).toBe(false)
    expect(report.cleanupComplete).toBe(true)
    expect(app.rows.map((row) => row.id)).toEqual([1])
  })
})

/** Failure text never leaves the candidate; returned handles need not be identity-qualified. */
describe('diagnostic startup and returned-handle safety', () => {
  it.each([{ failBaseline: true }, { failApplication: true }, { failRunning: true }])(
    'sanitizes startup failure %j',
    (options) => {
      const app = fixture(options)
      expect(() => app.run()).not.toThrow()
      const report = app.run()
      expect(report.completed).toBe(false)
      expect(JSON.stringify(report)).not.toContain('private')
      expect(app.calls).toEqual([])
    }
  )
  it('rebinds a returned handle by identity before later creation can make it drift', () => {
    const app = fixture({ driftingHandle: true })
    const report = app.run()
    expect(report.completed).toBe(true)
    expect(report.cleanupComplete).toBe(true)
    expect(app.rows.map((row) => row.id)).toEqual([1])
  })
})
