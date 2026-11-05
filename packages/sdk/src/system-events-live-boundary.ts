/** Protect the live suite from leaking native error text and hanging during cleanup. */
import { execFileSync } from 'node:child_process'

/** Preserve a check's success or failure while discarding untrusted error details and causes. */
export async function runLiveCheck<T>(check: () => T | Promise<T>): Promise<T> {
  try {
    return await check()
  } catch {
    throw new Error('System Events live check failed')
  }
}

/** Attempt to restore app state without exposing subprocess output or waiting indefinitely. */
export function stopSystemEvents(run: typeof execFileSync = execFileSync): void {
  try {
    run('osascript', ['-e', 'tell application id "com.apple.systemevents" to quit'], {
      stdio: 'ignore',
      timeout: 10_000,
    })
  } catch {
    throw new Error('System Events cleanup failed')
  }
}

/** Unknown inspection outcomes cannot establish ownership of an existing app. */
export function systemEventsIsRunning(run: typeof execFileSync = execFileSync): boolean {
  try {
    run('pgrep', ['-x', 'System Events'], { stdio: 'ignore', timeout: 10_000 })
    return true
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 1)
      return false
    throw new Error('System Events state inspection failed')
  }
}
