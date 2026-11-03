/**
 * Tests for how the contract generator records parent-scoped resources: a
 * resource whose resolving `get` records a parent (D10, command parents)
 * gets `parent: '<ParentKey>'` in the resource table, in both the declared
 * table type and the table value; a resource found at the application gets
 * none. Input positions referencing it take its parent's identity container,
 * so their JSON Schema requires `container`. A parent that references could
 * not name by identifier and resolve through a get fails generation.
 *
 * Expected text is written by hand from phases/13 D7 ("Resolvable targets")
 * and the fixture below.
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
 * playlists at the application. `queue` takes a track. Operation ids are
 * `app.<plural segment>.<command key>`.
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
enums: {}
hierarchy:
  children:
    playlists: { resource: Playlist, access: r, description: Playlists }
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
      "  Track: ResourceDescriptor<Track, string> & { readonly id: ValueType<string>; readonly get: 'tunes.tracks.getTrack'; readonly parent: 'Playlist' }"
    )
    expect(text).toContain(`  Track: {
    name: 'Track',
    record: trackRecordType,
    id: t.string({ description: 'The track id' }),
    get: 'tunes.tracks.getTrack',
    parent: 'Playlist',
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

describe('a parent that references cannot resolve', () => {
  it('fails generation, naming the resource and its parent', () => {
    const manifest = parseManifestYaml(TUNES)
    // Playlists can no longer be got, so a track's container could not be resolved.
    delete manifest.commands['getPlaylist']
    expect(generateContract(manifest).errors).toEqual([
      'tunes: resources.Track: the app gets a Track only within its Playlist, but references cannot name a Playlist by its identifier and resolve it through a get, so no reference to a Track could be resolved (phases/13 D7, resolvable targets).',
    ])
  })
})
