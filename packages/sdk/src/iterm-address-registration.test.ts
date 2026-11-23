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

/** Traversal identities must use the same required, non-null identifier domain as explicit items. */
it.each(['wrong-type', 'nullable'] as const)(
  'refuses a %s traversal selector at every boundary',
  (kind) => {
    const manifest = load()
    const parameter = manifest.commands['resolveSession']?.parameters.find(
      ({ name }) => name === 'sessionId'
    )
    if (parameter === undefined) throw new Error('Missing Session selector')
    if (kind === 'wrong-type') parameter.type = 'integer'
    else {
      parameter.nullable = true
      parameter.evidence = {
        nullable: { source: 'curated', note: 'Null is invalid for an identity selector' },
      }
    }
    const capture = (run: () => unknown): string => {
      try {
        run()
        return 'accepted'
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
    }
    const parsed = AppManifestSchema.safeParse(manifest)
    const generated = generateConsolidatedPackages(manifest, { appName: 'iterm' })
    const outcomes = {
      parse: parsed.success ? 'accepted' : parsed.error.message,
      generation: generated.errors.join(' '),
      manifest: capture(() => operationsFromManifest(manifest)),
      contract: capture(() => operationsFromContract(iTermContract, manifest)),
    }
    expect(
      Object.fromEntries(
        Object.entries(outcomes).map(([boundary, message]) => [
          boundary,
          message.includes('required non-null'),
        ])
      )
    ).toEqual({ parse: true, generation: true, manifest: true, contract: true })
    expect(generated.client.files).toEqual([])
  }
)

/** Alternate reads must carry the identity context of every advertised related field. */
it.each(['parent', 'parents'] as const)(
  'refuses a %s Tab list without its current Session’s Window context at every boundary',
  (syntax) => {
    const manifest = load()
    const list = manifest.commands['listTabs']
    const tabs = manifest.hierarchy.children['windows']?.children?.['tabs']
    const window = manifest.resources['Window']
    const get = manifest.commands['getWindow']
    if (list === undefined || tabs === undefined || window === undefined || get === undefined) {
      throw new Error('Missing Tab fixture')
    }
    manifest.resources['OtherWindow'] = { ...window, name: 'OtherWindow', plural: 'OtherWindows' }
    manifest.commands['getOtherWindow'] = { ...get, resourceType: 'OtherWindow' }
    manifest.hierarchy.children['otherWindows'] = {
      resource: 'OtherWindow',
      access: 'r',
      children: { tabs },
    }
    delete list.parent
    list.parents = [
      { resource: 'OtherWindow', collection: 'otherWindows', by: 'identity', parameter: 'id' },
    ]
    if (syntax === 'parent') {
      delete list.parents
      list.parent = { resource: 'OtherWindow', parameter: 'id' }
    }
    list.parameters = get.parameters
    list.resolvesReferences = false
    const capture = (run: () => unknown): string => {
      try {
        run()
        return 'accepted'
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
    }
    const parsed = AppManifestSchema.safeParse(manifest)
    const generated = generateConsolidatedPackages(manifest, { appName: 'iterm' })
    const outcomes = {
      parse: parsed.success ? 'accepted' : parsed.error.message,
      generation: generated.errors.join(' '),
      manifest: capture(() => operationsFromManifest(manifest)),
      contract: capture(() => operationsFromContract(iTermContract, manifest)),
    }
    expect(
      Object.fromEntries(
        Object.entries(outcomes).map(([boundary, message]) => [
          boundary,
          ['listTabs', 'currentSession', 'Window'].every((word) => message.includes(word)),
        ])
      )
    ).toEqual({ parse: true, generation: true, manifest: true, contract: true })
    expect(generated.client.files).toEqual([])
  }
)
