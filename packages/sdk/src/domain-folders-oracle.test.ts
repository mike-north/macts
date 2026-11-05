/**
 * Tests for the direct domain folder check the System Events live suite
 * records evidence with: the script text it sends, run here against
 * stand-ins for the app in an isolated context, and the reading of what the
 * scripting host printed.
 *
 * Expected outcomes follow the check's contract: per domain, by position,
 * each folder reads `ok` when the folder and then its POSIX path both read,
 * `missing` when either reports no such object (-1728), and `other:<number>`
 * for any other failure. It prints no value it read, and keeps nothing it
 * does not recognise.
 */

import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  DOMAIN_FOLDERS_SCRIPT,
  parseDomainFoldersCheck,
  type DomainFolderDomain,
  type DomainFolderObject,
  type DomainFoldersHost,
} from './domain-folders-oracle.js'

/** An app error carrying `errorNumber`, as the automation bridge raises. */
function appError(errorNumber: number): Error {
  return Object.assign(new Error('app error'), { errorNumber })
}

/** A member that fails with the app's error `errorNumber`. */
function failing(errorNumber: number) {
  return (): never => {
    throw appError(errorNumber)
  }
}

/** A stand-in folder whose POSIX path reads, or fails as `posixPath` does. */
function folder(posixPath: () => unknown = () => '/Library/Private'): () => DomainFolderObject {
  return () => ({ posixPath })
}

/** A stand-in domain whose three folders read as given; unlisted ones read. */
function domain(folders: Partial<DomainFolderDomain> = {}): DomainFolderDomain {
  return {
    applicationSupportFolder: folder(),
    applicationsFolder: folder(),
    libraryFolder: folder(),
    ...folders,
  }
}

/**
 * A stand-in System Events with `domains`, reachable only by position: it
 * has no `byId` and no call form, so a check that reached a domain by its id
 * or listed the domains would fail here.
 */
function standIn(domains: readonly DomainFolderDomain[]): DomainFoldersHost {
  const byPosition: { length: number; [index: number]: DomainFolderDomain } = {
    length: domains.length,
  }
  domains.forEach((entry, index) => {
    byPosition[index] = entry
  })
  return { version: () => '1.3.6', domains: byPosition }
}

/**
 * Run the script's text as the scripting host would: in an isolated context
 * whose `Application` returns `app`, then call its `run` handler. A reference
 * to anything outside the script's own text fails here as it would in the
 * automation process.
 */
function runScript(app: DomainFoldersHost): unknown {
  const bundleIds: unknown[] = []
  const context = {
    Application: (bundleId: unknown): DomainFoldersHost => {
      bundleIds.push(bundleId)
      return app
    },
  }
  const result: unknown = runInNewContext(`${DOMAIN_FOLDERS_SCRIPT}\nrun();`, context)
  expect(bundleIds).toEqual(['com.apple.systemevents'])
  return result
}

describe('the direct domain folder check', () => {
  it('prints the version, then ok for each folder whose folder and path both read', () => {
    expect(runScript(standIn([domain(), domain()]))).toBe('version:1.3.6\nok,ok,ok\nok,ok,ok')
  })

  it('prints missing when the folder read or the path read reports no such object (-1728)', () => {
    const app = standIn([
      domain({ applicationsFolder: failing(-1728) }),
      domain({ libraryFolder: folder(failing(-1728)) }),
    ])
    expect(runScript(app)).toBe('version:1.3.6\nok,missing,ok\nok,ok,missing')
  })

  it('prints other with the error number for any other failure, and other:none without one', () => {
    const app = standIn([
      domain({ applicationSupportFolder: folder(failing(-1700)) }),
      domain({
        applicationsFolder: () => {
          throw new TypeError('not an app error')
        },
      }),
    ])
    expect(runScript(app)).toBe('version:1.3.6\nother:-1700,ok,ok\nok,other:none,ok')
  })

  it('prints no value it read', () => {
    const output = runScript(standIn([domain(), domain({ libraryFolder: failing(-1728) })]))
    expect(output).not.toContain('/')
  })
})

describe('reading what the check printed', () => {
  it('keeps the version and each domain read, in order', () => {
    expect(
      parseDomainFoldersCheck('version:1.3.6\nok,missing,other:-1700\nok,ok,other:none\n')
    ).toEqual({
      outcome: 'checked',
      appVersion: '1.3.6',
      domains: [
        {
          applicationSupportFolder: { outcome: 'ok' },
          applicationsFolder: { outcome: 'missing' },
          libraryFolder: { outcome: 'other', errorNumber: -1700 },
        },
        {
          applicationSupportFolder: { outcome: 'ok' },
          applicationsFolder: { outcome: 'ok' },
          libraryFolder: { outcome: 'other', errorNumber: null },
        },
      ],
    })
  })

  it('keeps nothing else, such as a path, a version that is not dotted numbers, or a short row', () => {
    for (const stdout of [
      '',
      '/Library/Application Support',
      'ok,ok,ok',
      'version:/Users/someone\nok,ok,ok',
      'version:1.3.6\nok,ok',
      'version:1.3.6\nok,ok,/Library',
      'version:1.3.6\nok,ok,other:x',
    ]) {
      expect(parseDomainFoldersCheck(stdout)).toEqual({ outcome: 'unrecognised' })
    }
  })
})
