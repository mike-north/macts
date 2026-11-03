/**
 * Integration: no shipped app claims a reserved route segment.
 *
 * `introspect`, `rpc`, `references` and `transfers` name routes a macts host
 * serves beside the apps, so they are never an app's route segment (phases/13
 * D5, D7). The runtime refuses such an app at registration; this guard catches
 * it earlier, when a manifest is added, for every app in the repository. It
 * checks both spellings of an app's segment: the one derived from the manifest
 * and the one its generated contract carries.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D7)
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { normalizeAppRouteSegment } from '@macts/core'
import { RESERVED_APP_ROUTE_SEGMENTS } from '@macts/runtime'
import { loadRealApps, type RealApp } from '../src/real-contracts.js'

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

describe('route segments of every shipped app', () => {
  it('discovers the shipped apps', () => {
    expect(apps.length).toBeGreaterThan(0)
  })

  it('reserves exactly introspect, rpc, references and transfers', () => {
    expect([...RESERVED_APP_ROUTE_SEGMENTS].sort()).toEqual([
      'introspect',
      'references',
      'rpc',
      'transfers',
    ])
  })

  it('never uses a reserved segment, in the manifest or the contract', () => {
    const claims = apps.flatMap(({ name, manifest, contract }) => {
      const segments = new Set([normalizeAppRouteSegment(manifest.app.name), contract.app])
      return [...segments]
        .filter((segment) => RESERVED_APP_ROUTE_SEGMENTS.includes(segment))
        .map((segment) => `${name}: "${segment}"`)
    })

    expect(claims).toEqual([])
  })
})
