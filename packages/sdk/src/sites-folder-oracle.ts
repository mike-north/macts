/**
 * A direct, read-only existence check of the user's Sites folder, made
 * outside macts, for the System Events live suite to compare the SDK's read
 * against (`system-events-files.live.test.ts`). Test support only: nothing
 * in the package imports it.
 *
 * The check runs as its own automation script in a separate process. It asks
 * the app only whether the folder exists, and prints only `true` or `false`:
 * it never reads the folder's path or any other value, so it has none to
 * print. The app reporting no such object (-1728) counts as not existing;
 * any other failure fails the script, and only the process's exit status is
 * kept. The process's standard error is discarded, so nothing the app or the
 * scripting host writes there reaches the terminal.
 *
 * @see ./system-events-files.live.test.ts
 */

import { execFileSync } from 'node:child_process'

/** The part of System Events the check asks about: the user domain's Sites folder. */
export interface SitesFolderHost {
  readonly userDomain: { readonly sitesFolder: { exists(): boolean } }
}

/**
 * Whether `app`'s user domain has a Sites folder, as the text `true` or
 * `false`. It runs inside the automation process from its source text, so it
 * refers to nothing outside its own body.
 *
 * @throws Whatever the app raised, for any failure but "no such object" (-1728).
 */
export function sitesFolderExists(app: SitesFolderHost): string {
  try {
    return app.userDomain.sitesFolder.exists() ? 'true' : 'false'
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'errorNumber' in error) {
      if (error.errorNumber === -1728) return 'false'
    }
    throw error
  }
}

/**
 * The automation script the check runs: {@link sitesFolderExists} applied to
 * System Events, from a `run` handler, whose return value is what the
 * scripting host prints.
 */
export const SITES_FOLDER_SCRIPT = [
  `var sitesFolderExists = ${sitesFolderExists.toString()};`,
  'function run() {',
  "  return sitesFolderExists(Application('com.apple.systemevents'));",
  '}',
].join('\n')

/**
 * What the check found: whether the folder exists; that the script failed,
 * with only its exit status kept; or that it printed something other than
 * `true` or `false`, which is never kept.
 */
export type SitesFolderCheck =
  | { readonly outcome: 'checked'; readonly exists: boolean }
  | { readonly outcome: 'failed'; readonly status: number | null }
  | { readonly outcome: 'unrecognised' }

/** The check's result from what it printed. Anything but `true` or `false` is `unrecognised`. */
export function parseSitesFolderCheck(stdout: string): SitesFolderCheck {
  const token = stdout.trim()
  if (token === 'true' || token === 'false') return { outcome: 'checked', exists: token === 'true' }
  return { outcome: 'unrecognised' }
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
export function directSitesFolderCheck(): SitesFolderCheck {
  let stdout: string
  try {
    stdout = execFileSync('osascript', ['-l', 'JavaScript', '-e', SITES_FOLDER_SCRIPT], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 60_000,
    })
  } catch (error) {
    return { outcome: 'failed', status: exitStatusOf(error) }
  }
  return parseSitesFolderCheck(stdout)
}
