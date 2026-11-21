/** Hold the real server before initialization; the background launcher runs normally. */
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { clearInterval, setInterval } from 'node:timers'
import { setTimeout as delay } from 'node:timers/promises'

const gate = process.env.MACTS_TEST_START_GATE
if (gate && process.argv.includes('serve')) {
  // A receipt lets IPC tests release initialization only after the child sees disconnection.
  process.once('disconnect', () => {
    writeFileSync(join(gate, 'disconnected'), '')
  })
  writeFileSync(join(gate, 'entered'), String(process.pid))
  while (!existsSync(join(gate, 'release'))) await delay(20)
}

// Let the test expire only the readiness timer after the child has entered its gate.
if (gate && process.argv.includes('start') && process.env.MACTS_TEST_SHORT_DEADLINE === '1') {
  const schedule = globalThis.setTimeout
  /** @param {(...args: unknown[]) => void} callback @param {number | undefined} ms @param {unknown[]} args */
  globalThis.setTimeout = function (callback, ms, ...args) {
    if (ms !== 30_000) return schedule(callback, ms, ...args)
    const timer = setInterval(() => {
      if (existsSync(join(gate, 'expire'))) {
        clearInterval(timer)
        callback(...args)
      }
    }, 20)
    return timer
  }
}
