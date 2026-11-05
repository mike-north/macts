/**
 * Tests for the direct Sites folder existence check the System Events live
 * suite compares against: the script text it sends, run here against
 * stand-ins for the app in an isolated context, and the reading of what the
 * scripting host printed.
 *
 * Expected outcomes follow the check's contract: it prints `true` only for a
 * folder that exists, `false` for one that does not or that the app reports
 * as no such object (-1728), fails on any other error, never reads a path,
 * and keeps nothing it does not recognise.
 */

import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  SITES_FOLDER_SCRIPT,
  parseSitesFolderCheck,
  type SitesFolderHost,
} from './sites-folder-oracle.js'

/** An app error carrying `errorNumber`, as the automation bridge raises. */
function appError(errorNumber: number): Error {
  return Object.assign(new Error('app error'), { errorNumber })
}

/**
 * A stand-in System Events whose Sites folder answers `exists` with `exists`.
 * The folder has a path, which the check must never read; `reads` records
 * every member the check touches on it.
 */
function standIn(exists: () => boolean) {
  const reads: string[] = []
  const sitesFolder = new Proxy(
    { exists, posixPath: () => '/Users/someone/Sites' },
    {
      get(target, name, receiver): unknown {
        reads.push(String(name))
        const value: unknown = Reflect.get(target, name, receiver)
        return value
      },
    }
  )
  const app: SitesFolderHost = { userDomain: { sitesFolder } }
  return { app, reads }
}

/**
 * Run the script's text as the scripting host would: in an isolated context
 * whose `Application` returns `app`, then call its `run` handler. A reference
 * to anything outside the script's own text fails here as it would in the
 * automation process.
 */
function runScript(app: SitesFolderHost): unknown {
  const bundleIds: unknown[] = []
  const context = {
    Application: (bundleId: unknown): SitesFolderHost => {
      bundleIds.push(bundleId)
      return app
    },
  }
  const result: unknown = runInNewContext(`${SITES_FOLDER_SCRIPT}\nrun();`, context)
  expect(bundleIds).toEqual(['com.apple.systemevents'])
  return result
}

describe('the direct Sites folder existence check', () => {
  it('prints true for a folder that exists, asking only whether it exists', () => {
    const { app, reads } = standIn(() => true)
    expect(runScript(app)).toBe('true')
    expect(reads).toEqual(['exists'])
  })

  it('prints false for a folder that does not exist', () => {
    const { app, reads } = standIn(() => false)
    expect(runScript(app)).toBe('false')
    expect(reads).toEqual(['exists'])
  })

  it('prints false when the app reports no such object (-1728)', () => {
    const { app } = standIn(() => {
      throw appError(-1728)
    })
    expect(runScript(app)).toBe('false')
  })

  it('fails on any other error, printing nothing', () => {
    const { app } = standIn(() => {
      throw appError(-1700)
    })
    expect(() => runScript(app)).toThrow()
  })
})

describe('reading what the check printed', () => {
  it('keeps true or false, trimmed', () => {
    expect(parseSitesFolderCheck('true\n')).toEqual({ outcome: 'checked', exists: true })
    expect(parseSitesFolderCheck('false')).toEqual({ outcome: 'checked', exists: false })
  })

  it('keeps nothing else, such as a path', () => {
    for (const stdout of ['/Users/someone/Sites\n', '', 'undefined', 'present']) {
      expect(parseSitesFolderCheck(stdout)).toEqual({ outcome: 'unrecognised' })
    }
  })
})
