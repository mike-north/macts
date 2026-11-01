/**
 * Tests for the HTTP server's listener lifecycle.
 *
 * `start()` is the point at which hosts announce the server (for example,
 * `macts --serve` prints its URL right after it). These tests pin that `start()`
 * resolves only once the listener accepts connections, and rejects when the
 * listener cannot bind.
 *
 * Regression: `start()` used to resolve as soon as `@hono/node-server`'s
 * `serve` returned, before the socket was bound, so `macts --serve` announced
 * a URL that refused the first connections on a slow machine. The port-in-use
 * case reproduces that deterministically: before the fix, `start()` resolved
 * even though the bind failed. The connection case depends on timing and only
 * guards the property on machines slow enough to lose the race.
 *
 * @see https://nodejs.org/api/net.html#serverlisten
 */

import { createServer as createNetServer, connect, type Server } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { ALLOW_ALL_POLICY } from '@macts/runtime'
import { createMultiServer, type ServerInstance } from './index.js'

/** Bind an ephemeral loopback port and keep it bound until closed. */
async function occupyPort(): Promise<{ port: number; server: Server }> {
  return new Promise((resolve, reject) => {
    const server = createNetServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address !== null && typeof address === 'object') resolve({ port: address.port, server })
      else reject(new Error('Could not determine the bound port'))
    })
  })
}

/** Release a port held by {@link occupyPort}. */
async function release(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve()
    })
  })
}

/** Whether a TCP connection to the loopback port is accepted right now. */
async function accepts(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      resolve(false)
    })
  })
}

const started: ServerInstance[] = []

afterEach(async () => {
  for (const instance of started.splice(0)) await instance.stop()
})

/** A server with no apps and no restrictions, on the given loopback port. */
function serverOn(port: number): ServerInstance {
  return createMultiServer([], {
    port,
    host: '127.0.0.1',
    rateLimit: false,
    governance: { policy: ALLOW_ALL_POLICY },
  })
}

describe('ServerInstance.start (regression: announced before listening)', () => {
  it('resolves only once the listener accepts connections', async () => {
    const { port, server: holder } = await occupyPort()
    await release(holder)
    const instance = serverOn(port)
    started.push(instance)

    await instance.start()

    // No waiting or retrying: the connection must be accepted the moment
    // start() resolves.
    expect(await accepts(port)).toBe(true)
    expect(instance.url).toBe(`http://127.0.0.1:${String(port)}`)
  })

  it('rejects with the bind error when the port is already in use', async () => {
    const { port, server: holder } = await occupyPort()
    try {
      const instance = serverOn(port)
      await expect(instance.start()).rejects.toMatchObject({ code: 'EADDRINUSE' })
      expect(instance.url).toBeNull()
    } finally {
      await release(holder)
    }
  })
})
