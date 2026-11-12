/** Own a launcher's detached child independently of its readiness or PID file. */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Output from the launcher, whose exit does not imply its detached child exited. */
interface LaunchResult {
  readonly stdout: string
  readonly stderr: string
  readonly code: number
}

/** An owned launcher and the child identity recorded at its spawn boundary. */
export interface OwnedBackground {
  readonly result: Promise<LaunchResult>
  /** Terminate and verify the child before closing a client; idempotent after exit. */
  cleanup(close?: () => Promise<void>): Promise<void>
  /** True only after cleanup confirmed that the child no longer exists. */
  exited(): boolean
}

/** Wait for the OS to report that the recorded process is gone. */
async function waitForExit(pid: number, timeout: number): Promise<boolean> {
  const deadline = Date.now() + timeout
  do {
    try {
      process.kill(pid, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true
      throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  } while (Date.now() < deadline)
  return false
}

/** Start a launcher with a private receipt written synchronously when it spawns its child. */
export function launchOwnedBackground(
  executable: string,
  args: readonly string[],
  receiptDir: string,
  env: NodeJS.ProcessEnv,
  cwd?: string
): OwnedBackground {
  const receipt = join(receiptDir, 'spawned-child.pid')
  const preload = pathToFileURL(
    fileURLToPath(new URL('./record-background-spawn.mjs', import.meta.url))
  ).href
  const child = spawn(executable, [...args], {
    env: {
      ...env,
      MACTS_TEST_CHILD_RECEIPT: receipt,
      NODE_OPTIONS: `${env['NODE_OPTIONS'] ?? ''} --import ${preload}`,
    },
    ...(cwd !== undefined ? { cwd } : {}),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })
  const result = new Promise<LaunchResult>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 1 })
    })
  })
  let confirmed = false
  return {
    result,
    exited: () => confirmed,
    async cleanup(close) {
      // Once the launcher has exited, it cannot spawn a child after inspection.
      try {
        await result
      } catch {
        /* Inspect the receipt even if launch failed. */
      }
      if (!confirmed) {
        if (existsSync(receipt)) {
          const pid = Number(readFileSync(receipt, 'utf8'))
          if (!Number.isSafeInteger(pid) || pid <= 0)
            throw new Error('Invalid background child receipt')
          try {
            process.kill(pid, 'SIGTERM')
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
          }
          if (!(await waitForExit(pid, 5000))) {
            try {
              process.kill(pid, 'SIGKILL')
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
            }
            if (!(await waitForExit(pid, 5000)))
              throw new Error(`Background process ${String(pid)} did not exit`)
          }
        }
        confirmed = true
      }
      if (close) await close()
    },
  }
}
