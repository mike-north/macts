/**
 * Integration: every real contract's descriptors carry the JSON Schema of
 * their input's wire values.
 *
 * Each app package with a manifest is imported at its `/contract` subpath,
 * where it exports its generated contract. For every operation the descriptor's `inputJsonSchema` must
 * be present and equal what an adapter derives itself,
 * `z.toJSONSchema(input.wire, { target: 'draft-7' })`. The generator computes
 * the field from value types it builds in process; this checks that they are
 * the value types the shipped contract constructs.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2, the `inputJsonSchema` field; D9)
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  APP_NAMES,
  loadRealApps,
  missingAppDependencies,
  type RealApp,
} from '../src/real-contracts.js'

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

describe('inputJsonSchema on every real contract', () => {
  it('declares every app package as a dependency, so each is built before this test', () => {
    expect(missingAppDependencies()).toEqual([])
    // Guards against a vacuous pass if the manifests directory moves.
    expect(APP_NAMES.length).toBeGreaterThan(30)
  })

  it('is present on every operation and equals the JSON Schema of its input wire', () => {
    let checked = 0
    for (const { name, contract } of apps) {
      for (const operation of Object.values(contract.operations)) {
        checked++
        const label = `${name}: ${operation.id}`
        expect(operation.inputJsonSchema, label).toBeDefined()
        expect(operation.inputJsonSchema, label).toStrictEqual(
          z.toJSONSchema(operation.input.wire, { target: 'draft-7' })
        )
      }
    }
    // Guards against a vacuous pass: the shipped contracts have hundreds of operations.
    expect(checked).toBeGreaterThan(300)
  })
})
