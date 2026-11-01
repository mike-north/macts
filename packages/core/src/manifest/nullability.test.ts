/**
 * Tests for the nullability and resettability decisions shared by the contract
 * generator and the nullability probe.
 *
 * Expected values follow the D10 rules by hand: a read field is nullable
 * unless there is evidence that it is not; the primary identifier property is
 * never nullable, whatever the manifest claims; a parameter accepts null only
 * with a claim; and a property is resettable only with curated evidence.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A4 (presence, nullability, and updates)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (native missing value; evidence-based defaults)
 */

import { describe, expect, it } from 'vitest'
import {
  ignoredIdentifierNullability,
  resolveParameterNullability,
  resolveReadNullability,
  resolveResettability,
} from './nullability.js'
import type { NullabilityEvidence } from './schemas/evidence.js'
import type { CommandParameter } from './schemas/command.js'
import type { Property } from './schemas/property.js'
import type { Resource } from './schemas/resource.js'

const PROBE_NULLS: NullabilityEvidence = {
  source: 'probe',
  observedAt: '2026-10-31T12:00:00.000Z',
  bundleId: 'com.example.jotter',
  appVersion: '2.1',
  osVersion: '27.2',
  sampleSize: 40,
  nullCount: 3,
  failedReads: 0,
}
const PROBE_CLEAN: NullabilityEvidence = { ...PROBE_NULLS, nullCount: 0 }
const CURATED: NullabilityEvidence = { source: 'curated', note: 'The app requires it' }
const SDEF: NullabilityEvidence = { source: 'sdef' }

function property(claim: Pick<Property, 'nullable' | 'evidence' | 'resettable'> = {}): Property {
  return { access: 'r', type: 'string', description: 'A field', optional: false, ...claim }
}

function resource(properties: Record<string, Property>): Resource {
  return {
    name: 'Note',
    plural: 'Notes',
    description: 'A note',
    properties,
    identifiers: [{ property: 'uid', primary: true }],
  }
}

describe('resolveReadNullability', () => {
  it('is nullable by default, when the manifest makes no claim', () => {
    const title = property()
    expect(resolveReadNullability(resource({ title }), 'title', title)).toEqual({
      nullable: true,
      basis: 'default',
    })
  })

  it('is never nullable for the primary identifier property', () => {
    const uid = property()
    expect(resolveReadNullability(resource({ uid }), 'uid', uid)).toEqual({
      nullable: false,
      basis: 'identifier',
    })
  })

  it('keeps the identifier non-null even against a contrary claim', () => {
    const uid = property({ nullable: true, evidence: { nullable: PROBE_NULLS } })
    expect(resolveReadNullability(resource({ uid }), 'uid', uid)).toEqual({
      nullable: false,
      basis: 'identifier',
    })
  })

  it('follows a curated claim, either way, with the claim as its basis', () => {
    for (const nullable of [true, false]) {
      const title = property({ nullable, evidence: { nullable: CURATED } })
      expect(resolveReadNullability(resource({ title }), 'title', title)).toEqual({
        nullable,
        basis: CURATED,
      })
    }
  })

  it('follows probe evidence of empty values and of a clean sample', () => {
    const created = property({ nullable: true, evidence: { nullable: PROBE_NULLS } })
    expect(resolveReadNullability(resource({ created }), 'created', created)).toEqual({
      nullable: true,
      basis: PROBE_NULLS,
    })
    const words = property({ nullable: false, evidence: { nullable: PROBE_CLEAN } })
    expect(resolveReadNullability(resource({ words }), 'words', words)).toEqual({
      nullable: false,
      basis: PROBE_CLEAN,
    })
  })

  it('follows dictionary evidence', () => {
    const color = property({ nullable: true, evidence: { nullable: SDEF } })
    expect(resolveReadNullability(resource({ color }), 'color', color)).toEqual({
      nullable: true,
      basis: SDEF,
    })
  })

  it('treats every property as a non-identifier on a resource without identifiers', () => {
    const uid = property()
    const bare: Resource = {
      name: 'Tag',
      plural: 'Tags',
      description: 'A tag',
      properties: { uid },
    }
    expect(resolveReadNullability(bare, 'uid', uid)).toEqual({ nullable: true, basis: 'default' })
  })
})

describe('ignoredIdentifierNullability', () => {
  it('returns the evidence of a claim on the primary identifier', () => {
    const uid = property({ nullable: true, evidence: { nullable: PROBE_NULLS } })
    expect(ignoredIdentifierNullability(resource({ uid }), 'uid', uid)).toBe(PROBE_NULLS)
  })

  it('returns nothing for an identifier without a claim, or a claimed non-identifier', () => {
    const uid = property()
    const title = property({ nullable: true, evidence: { nullable: CURATED } })
    expect(ignoredIdentifierNullability(resource({ uid, title }), 'uid', uid)).toBeUndefined()
    expect(ignoredIdentifierNullability(resource({ uid, title }), 'title', title)).toBeUndefined()
  })
})

describe('resolveParameterNullability', () => {
  const PARAM: CommandParameter = {
    name: 'until',
    type: 'date',
    description: 'When',
    required: false,
  }

  it('does not accept null without a claim', () => {
    expect(resolveParameterNullability(PARAM)).toEqual({ nullable: false, basis: 'default' })
  })

  it('accepts null with a claim, which is its basis', () => {
    expect(
      resolveParameterNullability({ ...PARAM, nullable: true, evidence: { nullable: CURATED } })
    ).toEqual({ nullable: true, basis: CURATED })
  })
})

describe('resolveResettability', () => {
  const NOTE = { source: 'curated', note: 'reset.test.ts clears it' } as const

  it('is the curated evidence of a resettable property', () => {
    expect(
      resolveResettability(property({ resettable: true, evidence: { resettable: NOTE } }))
    ).toBe(NOTE)
  })

  it('is undefined without a resettable claim', () => {
    expect(resolveResettability(property())).toBeUndefined()
    expect(resolveResettability(property({ resettable: false }))).toBeUndefined()
  })
})
