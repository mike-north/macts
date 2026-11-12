/** Detached subprocess ownership survives client and startup failures. */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { launchOwnedBackground } from '../src/background-owner.js'

/** A launcher whose detached child delays its observable startup beyond ten seconds. */
const launcher = `
  const { spawn } = require('node:child_process');
  const child = spawn(process.execPath, ['-e', ${JSON.stringify("setTimeout(() => require('node:fs').writeFileSync(process.env.MARKER, 'started'), 12000); setInterval(() => {}, 1000)")}], { detached: true, stdio: 'ignore' });
  child.unref();
`

describe('detached background ownership', () => {
  it('terminates and confirms exit even when client close rejects', async () => {
    const root = mkdtempSync(join(tmpdir(), 'macts-owner-'))
    const owned = launchOwnedBackground(process.execPath, ['-e', launcher], root, {
      ...process.env,
      MARKER: join(root, 'started'),
    })
    try {
      await owned.result
      const pid = Number(readFileSync(join(root, 'spawned-child.pid'), 'utf8'))
      await expect(owned.cleanup(() => Promise.reject(new Error('close failed')))).rejects.toThrow(
        'close failed'
      )
      expect(owned.exited()).toBe(true)
      expect(() => process.kill(pid, 0)).toThrow()
    } finally {
      await owned.cleanup()
      if (owned.exited()) rmSync(root, { recursive: true, force: true })
    }
  }, 30000)

  it('owns a child before delayed startup creates any state', async () => {
    const root = mkdtempSync(join(tmpdir(), 'macts-owner-'))
    const marker = join(root, 'started')
    const owned = launchOwnedBackground(process.execPath, ['-e', launcher], root, {
      ...process.env,
      MARKER: marker,
    })
    try {
      await owned.result
      expect(existsSync(marker)).toBe(false)
      await owned.cleanup()
      expect(owned.exited()).toBe(true)
      await new Promise((resolve) => setTimeout(resolve, 12500))
      expect(existsSync(marker)).toBe(false)
    } finally {
      await owned.cleanup()
      if (owned.exited()) rmSync(root, { recursive: true, force: true })
    }
  }, 30000)
})
