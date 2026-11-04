/**
 * Tests for how the contract generator records the parents of resolving
 * operations: for each of a resource's `get` and `list` routes whose command
 * records a parent (D10, command parents), the resource table names it under
 * `parents`, in both the declared table type and the table value; a resource
 * whose routes work at the application gets no `parents`. The two may differ.
 * Input positions referencing the resource take its `get` parent's identity
 * container, so their JSON Schema requires `container`. A parent that
 * references could not name by identifier and resolve through a get fails
 * generation.
 *
 * Expected text is written by hand from phases/13 D7 ("Parent-scoped
 * targets") and the fixture below.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md §D7
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import { describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../../manifest/loader.js'
import { CONTRACT_MODULE_PATH, generateContract } from './index.js'

const yaml = String.raw

/**
 * Tracks are got within a playlist (`getTrack` records `parent: Playlist`);
 * playlists at the application. Messages are got within a mailbox but listed
 * within an account, so their two parents differ. `queue` takes a track and
 * `archive` a message. Operation ids are `app.<plural segment>.<command key>`.
 */
const TUNES = yaml`
version: '1.0'
app:
  bundleId: com.example.tunes
  name: Tunes
  tccEntitlements: []
resources:
  Playlist:
    name: Playlist
    plural: Playlists
    description: A playlist
    properties:
      id: { access: r, type: string, description: The playlist id }
    identifiers:
      - property: id
        primary: true
  Track:
    name: Track
    plural: Tracks
    description: A track
    properties:
      id: { access: r, type: string, description: The track id }
    identifiers:
      - property: id
        primary: true
  Account:
    name: Account
    plural: Accounts
    description: An account
    properties:
      id: { access: r, type: string, description: The account id }
    identifiers:
      - property: id
        primary: true
  Mailbox:
    name: Mailbox
    plural: Mailboxes
    description: A mailbox
    properties:
      id: { access: r, type: string, description: The mailbox id }
    identifiers:
      - property: id
        primary: true
  Message:
    name: Message
    plural: Messages
    description: A message
    properties:
      id: { access: r, type: string, description: The message id }
    identifiers:
      - property: id
        primary: true
enums: {}
hierarchy:
  children:
    playlists: { resource: Playlist, access: r, description: Playlists }
    accounts: { resource: Account, access: r, description: Accounts }
    mailboxes: { resource: Mailbox, access: r, description: Mailboxes }
commands:
  getPlaylist:
    name: get
    description: Get a playlist
    scope: resource
    resourceType: Playlist
    parameters:
      - { name: id, type: string, description: The playlist, required: true }
  getTrack:
    name: get
    description: Get a track of a playlist
    scope: resource
    resourceType: Track
    parent: { resource: Playlist, parameter: playlistId }
    parameters:
      - { name: playlistId, type: string, description: The playlist, required: true }
      - { name: id, type: string, description: The track, required: true }
  queue:
    name: queue
    description: Queue a track
    scope: application
    parameters:
      - name: track
        type: { resource: Track }
        description: The track to queue
        required: true
  getAccount:
    name: get
    description: Get an account
    scope: resource
    resourceType: Account
    parameters:
      - { name: id, type: string, description: The account, required: true }
  getMailbox:
    name: get
    description: Get a mailbox
    scope: resource
    resourceType: Mailbox
    parameters:
      - { name: id, type: string, description: The mailbox, required: true }
  getMessage:
    name: get
    description: Get a message of a mailbox
    scope: resource
    resourceType: Message
    parent: { resource: Mailbox, parameter: mailboxId }
    parameters:
      - { name: mailboxId, type: string, description: The mailbox, required: true }
      - { name: id, type: string, description: The message, required: true }
  listMessages:
    name: list
    description: List the messages of an account
    scope: resource
    resourceType: Message
    parent: { resource: Account, parameter: accountId }
    parameters:
      - { name: accountId, type: string, description: The account, required: true }
  archive:
    name: archive
    description: Archive a message
    scope: application
    parameters:
      - name: message
        type: { resource: Message }
        description: The message to archive
        required: true
`

/** The generated contract module. */
function contractText(manifest = parseManifestYaml(TUNES)): string {
  const generated = generateContract(manifest)
  expect(generated.errors).toEqual([])
  const found = generated.files.find(({ path }) => path === CONTRACT_MODULE_PATH)
  if (found === undefined) throw new Error('no contract module')
  return found.content
}

describe('the resource table of a parent-scoped resource', () => {
  const text = contractText()

  it('names its parent in the declared type and in the table', () => {
    expect(text).toContain(
      "  Track: ResourceDescriptor<Track, string> & { readonly id: ValueType<string>; readonly get: 'tunes.tracks.getTrack'; readonly parents: { readonly get: 'Playlist' } }"
    )
    expect(text).toContain(`  Track: {
    name: 'Track',
    record: trackRecordType,
    id: t.string({ description: 'The track id' }),
    get: 'tunes.tracks.getTrack',
    parents: { get: 'Playlist' },
  },`)
  })

  it('names none for a resource found at the application', () => {
    expect(text).toContain(
      "  Playlist: ResourceDescriptor<Playlist, string> & { readonly id: ValueType<string>; readonly get: 'tunes.playlists.getPlaylist' }"
    )
    expect(text).toContain(`  Playlist: {
    name: 'Playlist',
    record: playlistRecordType,
    id: t.string({ description: 'The playlist id' }),
    get: 'tunes.playlists.getPlaylist',
  },`)
  })

  it("requires the parent's identity container in an input position's JSON Schema", () => {
    const start = text.indexOf("id: 'tunes.app.queue'")
    const schemaStart = text.indexOf('inputJsonSchema: ', start)
    const line = text.slice(schemaStart, text.indexOf('\n', schemaStart))
    const schema = JSON.parse(line.slice('inputJsonSchema: '.length).replace(/,$/, '')) as {
      properties: { track: { properties: { reference: { anyOf: Record<string, unknown>[] } } } }
    }
    const branches = schema.properties.track.properties.reference.anyOf
    expect(branches.map((branch) => branch['required'])).toEqual([
      ['resource', 'form', 'cardinality', 'id', 'container'],
      ['resource', 'form', 'cardinality', 'selector', 'container'],
    ])
    const container = (branches[0]?.['properties'] as Record<string, Record<string, unknown>>)[
      'container'
    ]
    expect(container?.['properties']).toMatchObject({
      resource: { type: 'string', const: 'Playlist' },
      form: { type: 'string', const: 'identity' },
    })
  })
})

/** The parsed input JSON Schema of the operation `id` in the contract module `text`. */
function inputSchema(text: string, id: string): Record<string, unknown> {
  const start = text.indexOf(`id: '${id}'`)
  const schemaStart = text.indexOf('inputJsonSchema: ', start)
  const line = text.slice(schemaStart, text.indexOf('\n', schemaStart))
  return JSON.parse(line.slice('inputJsonSchema: '.length).replace(/,$/, '')) as Record<
    string,
    unknown
  >
}

describe('a resource whose get and list parents differ', () => {
  const text = contractText()

  it('names both, each under its route, in the declared type and in the table', () => {
    expect(text).toContain(
      "  Message: ResourceDescriptor<Message, string> & { readonly id: ValueType<string>; readonly get: 'tunes.messages.getMessage'; readonly list: 'tunes.messages.listMessages'; readonly parents: { readonly get: 'Mailbox'; readonly list: 'Account' } }"
    )
    expect(text).toContain(`  Message: {
    name: 'Message',
    record: messageRecordType,
    id: t.string({ description: 'The message id' }),
    get: 'tunes.messages.getMessage',
    list: 'tunes.messages.listMessages',
    parents: { get: 'Mailbox', list: 'Account' },
  },`)
  })

  it("requires the get parent's identity container on a single reference to it", () => {
    const schema = inputSchema(text, 'tunes.app.archive') as {
      properties: { message: { properties: { reference: { anyOf: Record<string, unknown>[] } } } }
    }
    const branches = schema.properties.message.properties.reference.anyOf
    expect(branches.map((branch) => branch['required'])).toEqual([
      ['resource', 'form', 'cardinality', 'id', 'container'],
      ['resource', 'form', 'cardinality', 'selector', 'container'],
    ])
    for (const branch of branches) {
      const container = (branch['properties'] as Record<string, Record<string, unknown>>)[
        'container'
      ]
      // The get resolves a single reference, so its parent, not the list's.
      expect(container?.['properties']).toMatchObject({
        resource: { type: 'string', const: 'Mailbox' },
        form: { type: 'string', const: 'identity' },
      })
    }
  })

  it("requires the get parent on a message standing as another reference's container", () => {
    // The track's playlist container may itself sit in any container, a message among them.
    const branches = identityBranches(inputSchema(text, 'tunes.app.queue'), 'Message')
    expect(branches.length).toBeGreaterThan(0)
    for (const branch of branches) {
      expect(branch['required']).toContain('container')
      const container = (branch['properties'] as Record<string, Record<string, unknown>>)[
        'container'
      ]
      expect(container?.['properties']).toMatchObject({
        resource: { type: 'string', const: 'Mailbox' },
        form: { type: 'string', const: 'identity' },
      })
    }
  })
})

/** Every object schema in `schema` describing an identity reference to `resource`. */
function identityBranches(schema: unknown, resource: string): Record<string, unknown>[] {
  if (Array.isArray(schema)) return schema.flatMap((item) => identityBranches(item, resource))
  if (typeof schema !== 'object' || schema === null) return []
  const node = schema as Record<string, unknown>
  const properties = node['properties'] as Record<string, Record<string, unknown>> | undefined
  const own =
    properties?.['resource']?.['const'] === resource && properties['form']?.['const'] === 'identity'
      ? [node]
      : []
  return [...own, ...Object.values(node).flatMap((value) => identityBranches(value, resource))]
}

describe('a parent that references cannot resolve', () => {
  it('fails generation, naming the resource and its parent', () => {
    const manifest = parseManifestYaml(TUNES)
    // Playlists can no longer be got, so a track's container could not be resolved.
    delete manifest.commands['getPlaylist']
    expect(generateContract(manifest).errors).toEqual([
      'tunes: resources.Track: the app gets each Track only within its Playlist, but references cannot name the Playlist by its identifier and resolve it through a get, so no Track reference could be resolved.',
    ])
  })

  it('fails generation when the parent has a get but no identifier', () => {
    const manifest = parseManifestYaml(TUNES)
    // Playlists stay gettable but can no longer be named by an identifier, so a
    // track's container could not be written as an identity reference.
    delete manifest.resources['Playlist']?.identifiers
    expect(generateContract(manifest).errors).toEqual([
      'tunes: resources.Track: the app gets each Track only within its Playlist, but references cannot name the Playlist by its identifier and resolve it through a get, so no Track reference could be resolved.',
    ])
  })

  it("fails generation for a list's parent too, naming the route", () => {
    const manifest = parseManifestYaml(TUNES)
    // Accounts can no longer be got, so a collection of messages could not be resolved.
    delete manifest.commands['getAccount']
    expect(generateContract(manifest).errors).toEqual([
      'tunes: resources.Message: the app lists Message objects only within their Account, but references cannot name the Account by its identifier and resolve it through a get, so no collection of Message objects could be resolved.',
    ])
  })
})
