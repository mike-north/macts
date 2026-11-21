/** Private parent/child handoff for a detached MCP server; PID files are not readiness. */
import type { ChildProcess } from 'node:child_process'

/** Allow contract loading on a busy host, while bounding how long start waits. @internal */
export const MCP_READY_TIMEOUT_MS = 30_000

/**
 * Only `mcp start` sets this private, one-use marker on its direct child's environment.
 * IPC alone does not imply launcher ownership. `serve` consumes the marker before
 * host initialization so later subprocesses cannot inherit the readiness obligation.
 * @internal
 */
export const MCP_START_ENV = 'MACTS_INTERNAL_MCP_START'

/** Each shutdown signal gets a bounded interval to produce an observed child exit. */
const EXIT_TIMEOUT_MS = 2000

/** The child sends this only after the daemon has finished binding its listener. @internal */
export const MCP_READY_MESSAGE = { type: 'macts:mcp:ready' } as const

/** A reaped child cannot become ready or own a listening server later. */
function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null
}

/** A signal being accepted is not exit evidence; only exit state or its event is. */
async function signalAndAwaitExit(child: ChildProcess, signal: NodeJS.Signals): Promise<boolean> {
  if (hasExited(child)) return true
  return new Promise((resolve) => {
    const finish = (exited: boolean): void => {
      clearTimeout(timer)
      child.off('exit', onExit)
      resolve(exited)
    }
    const onExit = (): void => {
      finish(true)
    }
    const timer = setTimeout(() => {
      finish(hasExited(child))
    }, EXIT_TIMEOUT_MS)
    child.once('exit', onExit)
    try {
      child.kill(signal)
    } catch {
      // A failed signal still needs exit evidence; otherwise the PID must be reported.
    }
  })
}

/** Stop only this launcher's child, escalating when graceful shutdown cannot be verified. */
async function terminate(child: ChildProcess): Promise<boolean> {
  if (child.pid === undefined || hasExited(child)) return true
  return (await signalAndAwaitExit(child, 'SIGTERM')) || signalAndAwaitExit(child, 'SIGKILL')
}

/**
 * Resolve on this child's explicit readiness, or reject after failure cleanup.
 * A single winning event owns the result, including when readiness arrives during shutdown.
 * The IPC channel and process handle are released only after the handoff or cleanup finishes.
 * @internal
 */
export function awaitMcpReadiness(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      void finish('readiness deadline of 30 seconds exceeded')
    }, MCP_READY_TIMEOUT_MS)

    const finish = async (failure?: string): Promise<void> => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      let message = failure
      if (failure !== undefined && !(await terminate(child))) {
        message = `${failure}; Could not confirm exit of MCP server (PID ${String(child.pid)})`
      }
      child.off('message', onMessage)
      child.off('exit', onExit)
      // IPC release can still emit an error after the outcome is committed.
      child.once('close', () => child.off('error', onError))
      child.off('disconnect', onDisconnect)
      if (child.connected) child.disconnect()
      child.unref()
      if (message === undefined) resolve()
      else reject(new Error(message))
    }
    const onMessage = (message: unknown): void => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === MCP_READY_MESSAGE.type
      ) {
        void finish()
      }
    }
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      void finish(
        `child exited before readiness (${signal === null ? `code ${String(code)}` : `signal ${signal}`})`
      )
    }
    const onError = (error: Error): void => {
      void finish(error.message)
    }
    const onDisconnect = (): void => {
      void finish('child disconnected before readiness')
    }
    child.on('message', onMessage)
    child.on('exit', onExit)
    child.on('error', onError)
    child.on('disconnect', onDisconnect)
  })
}
