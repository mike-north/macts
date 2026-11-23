/** Registration enforces the same versioned address contract as parsing and generation. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseManifestYaml, AppManifestSchema, generateConsolidatedPackages } from '@macts/core'
import { iTermContract } from '@macts/iterm/contract'
import { operationsFromContract, operationsFromManifest } from '@macts/runtime'

const load = () =>
  parseManifestYaml(
    readFileSync(new URL('../../../manifests/iterm/app.yaml', import.meta.url), 'utf8')
  )
describe('versioned addresses at registration', () => {
  it.each([
    operationsFromManifest,
    (manifest: ReturnType<typeof load>) => operationsFromContract(iTermContract, manifest),
  ])('refuses 1.0 with new metadata at both registrations', (register) => {
    const manifest = { ...load(), version: '1.0' as const }
    expect(() => register(manifest)).toThrow(/1\.1/)
  })
  it('refuses a stale operation address rather than ignoring descriptor metadata', () => {
    const manifest = load()
    const operation = iTermContract.operations['iterm.sessions.getWithinTab']
    if (operation === undefined) throw new Error('Missing Session operation')
    const contract = {
      ...iTermContract,
      operations: {
        ...iTermContract.operations,
        [operation.id]: { ...operation, address: undefined },
      },
    }
    expect(() => operationsFromContract(contract, manifest)).toThrow(/address/)
  })
})

it.each([
  operationsFromManifest,
  (manifest: ReturnType<typeof load>) => operationsFromContract(iTermContract, manifest),
])('refuses a positional ancestor declared as identity through either registration', (register) => {
  const manifest = load()
  const tab = manifest.commands['getSession']?.parents?.[1]
  if (tab === undefined) throw new Error('Missing Tab segment')
  tab.by = 'identity'
  expect(() => register(manifest)).toThrow(/identity|address/)
})

/** Identifier and effective lookup reads cannot require authority separate from ordinary listing. */
it.each(['id', 'name'])(
  'refuses separate identity reads for %s through both registrations',
  (name) => {
    const manifest = load()
    const session = manifest.resources['Session']
    const property = session?.properties[name]
    if (session === undefined || property === undefined) {
      throw new Error('Missing identity fixture')
    }
    session.identifiers = [
      { property: 'id', primary: true, targeting: 'byProperty', runtimeProperty: 'name' },
    ]
    property.separateRead = {
      operation: 'readIdentity',
      permission: 'iterm:sessions:readIdentity',
      reason: 'Separate identity authority',
    }
    expect(() => operationsFromManifest(manifest)).toThrow(/separate|identity/i)
    expect(() => operationsFromContract(iTermContract, manifest)).toThrow(/separate|identity/i)
  }
)

/** Read shapes that cannot carry action inputs must refuse before advertising any operation. */
it.each([
  ['resolveSession', true],
  ['resolveSession', false],
  ['listSessions', true],
  ['listSessions', false],
] as const)('refuses extra inputs on %s (required=%s) at every boundary', (key, required) => {
  const manifest = load()
  manifest.commands[key]?.parameters.push({
    name: 'extra',
    type: 'string',
    required,
    description: 'Extra read input',
  })
  const failure = (register: () => unknown): string => {
    try {
      register()
      return 'accepted'
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  }
  const parsed = AppManifestSchema.safeParse(manifest)
  const outcomes = {
    parse: parsed.success ? 'accepted' : parsed.error.message,
    generation: generateConsolidatedPackages(manifest, { appName: 'iterm' }).errors.join(' '),
    manifest: failure(() => operationsFromManifest(manifest)),
    contract: failure(() => operationsFromContract(iTermContract, manifest)),
  }
  expect(
    Object.fromEntries(
      Object.entries(outcomes).map(([boundary, message]) => [
        boundary,
        message.includes('non-selection inputs'),
      ])
    )
  ).toEqual({
    parse: true,
    generation: true,
    manifest: true,
    contract: true,
  })
})
