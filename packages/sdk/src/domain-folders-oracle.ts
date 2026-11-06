/**
 * A direct, read-only check of how System Events reads three domain folders
 * on each of its domains, made outside macts, for the System Events live
 * suite to record as evidence (`system-events-files.live.test.ts`). Test
 * support only: nothing in the package imports it.
 *
 * The folders are the ones the domain record holds with no evidence yet of
 * how the app reports them absent: {@link DOMAIN_FOLDERS}. The check reads
 * each one the way the codec reads a folder it encodes: the folder itself,
 * then its POSIX path, its identity. It reaches each domain by its position
 * in the app's domains, never by its id.
 *
 * The check runs as its own automation script in a separate process and
 * prints only fixed tokens, one per domain and folder: `ok` when both reads
 * succeed, `missing` when either reports no such object (-1728), and
 * `other:<number>` (or `other:none`) for any other failure. Every value it
 * reads is discarded, so it has no path, name or id to print. It also prints
 * the app's version, the one value the evidence needs. A failed script keeps
 * only the process's exit status, and the process's standard error is
 * discarded, so nothing the app or the scripting host writes there reaches
 * the terminal.
 *
 * @see ./system-events-files.live.test.ts
 */

import { execFileSync } from 'node:child_process'

/**
 * The domain folders the check reads, by their names in the manifest and in
 * the app, in the order the check prints them.
 */
export const DOMAIN_FOLDERS = [
  'applicationSupportFolder',
  'applicationsFolder',
  'libraryFolder',
] as const

/** One of {@link DOMAIN_FOLDERS}. */
export type DomainFolder = (typeof DOMAIN_FOLDERS)[number]

/** A folder as the check reads it: only its POSIX path, whose value is discarded. */
export interface DomainFolderObject {
  posixPath(): unknown
}

/** A domain as the check reads it: each folder property, called to get the folder. */
export type DomainFolderDomain = Readonly<Record<DomainFolder, () => DomainFolderObject>>

/** The part of System Events the check asks about: its version, and its domains by position. */
export interface DomainFoldersHost {
  version(): unknown
  readonly domains: { readonly length: number; readonly [index: number]: DomainFolderDomain }
}

/**
 * How each domain of `app` reads each folder, as text: a first line
 * `version:<the app's version>`, then one line per domain, in the app's
 * order, holding one token per folder of `folders`, comma-separated. It runs
 * inside the automation process from its source text, so it refers to
 * nothing outside its own body; the caller passes `folders`.
 */
export function readDomainFolders(
  app: DomainFoldersHost,
  folders: readonly DomainFolder[]
): string {
  const lines = ['version:' + String(app.version())]
  const count = app.domains.length
  for (let i = 0; i < count; i++) {
    const domain = app.domains[i]
    const tokens: string[] = []
    for (const name of folders) {
      let token: string
      try {
        const read = domain?.[name]
        if (read === undefined) throw new Error('The domain has no such folder.')
        read().posixPath()
        token = 'ok'
      } catch (error) {
        const errorNumber =
          typeof error === 'object' && error !== null && 'errorNumber' in error
            ? error.errorNumber
            : undefined
        token =
          errorNumber === -1728
            ? 'missing'
            : typeof errorNumber === 'number'
              ? 'other:' + String(errorNumber)
              : 'other:none'
      }
      tokens.push(token)
    }
    lines.push(tokens.join(','))
  }
  return lines.join('\n')
}

/**
 * The automation script the check runs: {@link readDomainFolders} applied to
 * System Events and {@link DOMAIN_FOLDERS}, from a `run` handler, whose
 * return value is what the scripting host prints.
 */
export const DOMAIN_FOLDERS_SCRIPT = [
  `var readDomainFolders = ${readDomainFolders.toString()};`,
  'function run() {',
  `  return readDomainFolders(Application('com.apple.systemevents'), ${JSON.stringify(DOMAIN_FOLDERS)});`,
  '}',
].join('\n')

/** How one domain read one folder. */
export type FolderRead =
  | { readonly outcome: 'ok' }
  | { readonly outcome: 'missing' }
  | { readonly outcome: 'other'; readonly errorNumber: number | null }

/**
 * What the check found: the app's version and, per domain in the app's
 * order, how it read each folder; that the script failed, with only its exit
 * status kept; or that it printed something other than the expected tokens,
 * which is never kept.
 */
export type DomainFoldersCheck =
  | {
      readonly outcome: 'checked'
      readonly appVersion: string
      readonly domains: readonly Readonly<Record<DomainFolder, FolderRead>>[]
    }
  | { readonly outcome: 'failed'; readonly status: number | null }
  | { readonly outcome: 'unrecognised' }

/** A version as dotted numbers, the only form of the app's version the check keeps. */
const VERSION = /^\d+(\.\d+)*$/

/** One token the check prints for a folder read, or `undefined` when it is not one. */
function parseFolderRead(token: string): FolderRead | undefined {
  if (token === 'ok') return { outcome: 'ok' }
  if (token === 'missing') return { outcome: 'missing' }
  if (token === 'other:none') return { outcome: 'other', errorNumber: null }
  const other = /^other:(-?\d+)$/.exec(token)
  if (other?.[1] !== undefined) return { outcome: 'other', errorNumber: Number(other[1]) }
  return undefined
}

/**
 * The check's result from what it printed. Anything but a version line and
 * one line of {@link DOMAIN_FOLDERS}`.length` recognised tokens per domain is
 * `unrecognised`.
 */
export function parseDomainFoldersCheck(stdout: string): DomainFoldersCheck {
  const [first, ...rows] = stdout.trim().split('\n')
  const version = first?.startsWith('version:') === true ? first.slice('version:'.length) : ''
  if (!VERSION.test(version)) return { outcome: 'unrecognised' }
  const domains: Record<DomainFolder, FolderRead>[] = []
  for (const row of rows) {
    const tokens = row.split(',')
    if (tokens.length !== DOMAIN_FOLDERS.length) return { outcome: 'unrecognised' }
    const reads: Partial<Record<DomainFolder, FolderRead>> = {}
    for (const [index, folder] of DOMAIN_FOLDERS.entries()) {
      const read = parseFolderRead(tokens[index] ?? '')
      if (read === undefined) return { outcome: 'unrecognised' }
      reads[folder] = read
    }
    domains.push(reads as Record<DomainFolder, FolderRead>)
  }
  return { outcome: 'checked', appVersion: version, domains }
}

/** The exit status of a failed child process, from what `execFileSync` threw. */
function exitStatusOf(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return typeof error.status === 'number' ? error.status : null
  }
  return null
}

/**
 * Run the check against the real System Events, read-only, with standard
 * input and error ignored and standard output captured. A failed run keeps
 * only its exit status; its error, which can quote the process's output, is
 * dropped.
 */
export function directDomainFoldersCheck(): DomainFoldersCheck {
  let stdout: string
  try {
    stdout = execFileSync('osascript', ['-l', 'JavaScript', '-e', DOMAIN_FOLDERS_SCRIPT], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 120_000,
    })
  } catch (error) {
    return { outcome: 'failed', status: exitStatusOf(error) }
  }
  return parseDomainFoldersCheck(stdout)
}

/**
 * The macOS version, as dotted numbers, or `undefined` when it cannot be read
 * in that form. Read with `sw_vers`, standard error discarded.
 */
export function macosVersion(): string | undefined {
  try {
    const version = execFileSync('sw_vers', ['-productVersion'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10_000,
    }).trim()
    return VERSION.test(version) ? version : undefined
  } catch {
    return undefined
  }
}
