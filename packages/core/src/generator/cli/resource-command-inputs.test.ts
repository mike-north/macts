/**
 * Tests for the inputs a generated CLI resource command asks for.
 *
 * A resource command acts on one item, selected as a get selects it, and the
 * app receives that item as the command's direct parameter (phases/13 D4 and
 * D10, #287). Its CLI command asks only for the inputs the operation uses, in
 * the SDK method's order: a flag for the parent's identifier when the
 * command records a parent, one positional for the item's identifier, then a
 * flag for each other declared parameter, required ones first.
 *
 * Regression (#287): the CLI asked for a required item positional it never
 * passed on, for parent flags taken from the resource's place in the
 * hierarchy that it never passed on either, and, where the manifest declared
 * the identifier as a parameter too, for the identifier a second time as a
 * flag.
 *
 * The expected text is written by hand from the fixture below.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D4, D10)
 * @see https://github.com/mike-north/macts/issues/287
 */

import { describe, expect, it } from 'vitest'
import { generateCliPlugin } from './index.js'
import type { AppManifest, Command } from '../../manifest/index.js'

/** A declared parameter. */
function param(
  name: string,
  type: string,
  description: string,
  required: boolean
): Command['parameters'][number] {
  return { name, type, description, required }
}

/** A resource-scoped command on `resourceType`. */
function onResource(
  name: string,
  resourceType: string,
  parameters: Command['parameters'],
  parent?: Command['parent']
): Command {
  return {
    name,
    description: `${name} a ${resourceType.toLowerCase()}`,
    scope: 'resource',
    resourceType,
    parameters,
    ...(parent === undefined ? {} : { parent }),
  }
}

const PLAYLIST_PARENT = { resource: 'Playlist', parameter: 'playlistId' } as const

/**
 * A jukebox whose tracks are nested under playlists in the hierarchy. A
 * track's `refresh` records its playlist as its parent and declares other
 * parameters, one optional before one required; its `rate` records no
 * parent.
 */
const JUKEBOX: AppManifest = {
  version: '1.0',
  app: { bundleId: 'com.example.jukebox', name: 'Jukebox', tccEntitlements: [] },
  suites: [],
  resources: {
    Playlist: {
      name: 'Playlist',
      plural: 'Playlists',
      description: 'A playlist',
      properties: {
        persistentID: { access: 'r', type: 'string', description: 'ID', optional: false },
      },
      identifiers: [{ property: 'persistentID', primary: true, targeting: 'byProperty' }],
    },
    Track: {
      name: 'Track',
      plural: 'Tracks',
      description: 'A track',
      properties: {
        persistentID: { access: 'r', type: 'string', description: 'ID', optional: false },
      },
      identifiers: [{ property: 'persistentID', primary: true, targeting: 'byProperty' }],
    },
  },
  enums: {},
  hierarchy: {
    children: {
      playlists: {
        resource: 'Playlist',
        access: 'r',
        children: { tracks: { resource: 'Track', access: 'r' } },
      },
    },
  },
  relationships: [],
  commands: {
    getPlaylist: onResource('get', 'Playlist', [
      param('persistentID', 'string', 'Persistent ID of the playlist', true),
    ]),
    getTrack: onResource(
      'get',
      'Track',
      [
        param('playlistId', 'string', 'Persistent ID of the playlist', true),
        param('persistentID', 'string', 'Persistent ID of the track', true),
      ],
      PLAYLIST_PARENT
    ),
    refresh: onResource(
      'refresh',
      'Track',
      [
        param('playlistId', 'string', 'Persistent ID of the playlist', true),
        param('persistentID', 'string', 'Persistent ID of the track', true),
        param('deep', 'boolean', 'Re-read the whole file', false),
        param('mode', 'string', 'What to refresh', true),
      ],
      PLAYLIST_PARENT
    ),
    rate: onResource('rate', 'Track', [
      param('persistentID', 'string', 'Persistent ID of the track', true),
      param('stars', 'integer', 'The rating', true),
    ]),
  },
}

const result = generateCliPlugin(JUKEBOX, {
  packageName: '@macts/jukebox',
  sdkPackageName: '@macts/sdk-jukebox',
})

/** The content of the generated file at a path under the commands directory. */
function command(path: string): string {
  const file = result.files.find((f) => f.path.endsWith(`commands/${path}`))
  if (file === undefined) throw new Error(`no generated command at ${path}`)
  return file.content
}

describe('a generated CLI resource command', () => {
  it('generates without errors', () => {
    expect(result.errors).toEqual([])
  })

  // The parent flag, the item positional labelled as the get labels it, then
  // the other parameters, required first, and nothing else.
  it('asks for the parent, the item and the other declared parameters, in signature order', () => {
    expect(command('playlists/tracks/refresh.ts')).toContain(
      [
        "  json = Option.Boolean('--json', { description: 'Output as JSON' });",
        '  playlistId = Option.String(\'--playlist-id\', { required: true, description: "Persistent ID of the playlist" });',
        "  trackId = Option.String({ name: 'persistent-id', required: true });",
        '  mode = Option.String(\'--mode\', { required: true, description: "What to refresh" });',
        '  deep = Option.Boolean(\'--deep\', { description: "Re-read the whole file" });',
        '  async execute(): Promise<number> {',
      ].join('\n')
    )
  })

  it('passes every input it asks for to the SDK method, in the same order', () => {
    expect(command('playlists/tracks/refresh.ts')).toContain(
      'await client.tracks.refresh(' +
        'this.playlistId as unknown as Parameters<typeof client.tracks.refresh>[0], ' +
        'this.trackId as unknown as Parameters<typeof client.tracks.refresh>[1], ' +
        'this.mode as unknown as Parameters<typeof client.tracks.refresh>[2], ' +
        'this.deep as unknown as Parameters<typeof client.tracks.refresh>[3]);'
    )
  })

  // Regression: the item's identifier was asked for twice, as a positional
  // the command never used and as a flag.
  it('asks for the item only once, as the positional', () => {
    const refresh = command('playlists/tracks/refresh.ts')
    expect(refresh).not.toContain("'--persistent-id'")
    expect(refresh.match(/Option\.String\(\{ name: /g)).toHaveLength(1)
  })

  // Regression: parent flags came from the hierarchy, whether or not the
  // command records a parent, and were never passed on.
  it('asks for no parent flag when the command records no parent', () => {
    const rate = command('playlists/tracks/rate.ts')
    expect(rate).not.toContain('--playlist-id')
    expect(rate).toContain(
      [
        "  json = Option.Boolean('--json', { description: 'Output as JSON' });",
        "  trackId = Option.String({ name: 'persistent-id', required: true });",
        '  stars = Option.String(\'--stars\', { required: true, description: "The rating" });',
        '  async execute(): Promise<number> {',
      ].join('\n')
    )
    expect(rate).toContain(
      'await client.tracks.rate(' +
        'this.trackId as unknown as Parameters<typeof client.tracks.rate>[0], ' +
        'this.stars as unknown as Parameters<typeof client.tracks.rate>[1]);'
    )
  })

  // The item is found as the get finds it, matched on a persistent ID nothing
  // claims unique, within its playlist, which is matched the same way, so the
  // help says the first match is used for each: the item's sentence, then the
  // parent's (phases/13 D10, identifier targeting).
  it("adds the item's and the parent's first-match sentences to its help", () => {
    expect(command('playlists/tracks/refresh.ts')).toContain(
      'description: "refresh a track. When several tracks share the same persistent ID, the first match in the app\'s order is used, and the operation does not fail as ambiguous. When several playlists share the same persistent ID, the first match in the app\'s order is used as the playlist.",'
    )
  })
})
