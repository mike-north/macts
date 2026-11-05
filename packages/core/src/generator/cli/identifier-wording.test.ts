/**
 * Tests for how generated CLI commands name the identifier that addresses one
 * item.
 *
 * A get command, and any other resource command that takes an item's
 * identifier positionally, names the resource's actual identifier: its primary
 * identifier property, whatever the get command calls its parameter. The
 * description, the doc comment and the positional's usage label all use it.
 * Regression (#224 review): every get command said "by ID" and showed a
 * generic positional, even for Music playlists and tracks, which are looked up
 * by persistent ID and also carry a numeric `id`, and for TextEdit documents,
 * which are looked up by name.
 *
 * @see https://github.com/arcanis/clipanion (positional `name` sets the usage label)
 */

import { describe, it, expect } from 'vitest'
import { generateCliPlugin } from './index.js'
import type { AppManifest, Command } from '../../manifest/index.js'

/** A resource command backed by the given resource. */
function resourceCommand(
  name: string,
  resourceType: string,
  parameters: Command['parameters'],
  parent?: Command['parent']
): Command {
  return {
    name,
    description: `${name} ${resourceType}`,
    scope: 'resource',
    resourceType,
    parameters,
    ...(parent === undefined ? {} : { parent }),
  }
}

/** A required string parameter. */
function param(name: string): Command['parameters'][number] {
  return { name, type: 'string', description: name, required: true }
}

/**
 * Resources covering each identifier shape: `id`, a property identifier
 * (`persistentID`) at the top level and under a command parent, `name`, a get
 * parameter that differs from the identifier property, and a resource with no
 * declared identifier.
 */
function buildManifest(): AppManifest {
  const stringProp = { access: 'r', type: 'string', description: 'x', optional: false } as const
  return {
    version: '1.0',
    app: { bundleId: 'com.example.ids', name: 'Ids', tccEntitlements: [] },
    suites: [],
    resources: {
      Item: {
        name: 'Item',
        plural: 'Items',
        description: 'An item',
        properties: { id: stringProp },
        identifiers: [{ property: 'id', primary: true, targeting: 'byId' }],
      },
      Playlist: {
        name: 'Playlist',
        plural: 'Playlists',
        description: 'A playlist',
        properties: { id: stringProp, persistentID: stringProp },
        identifiers: [{ property: 'persistentID', primary: true, targeting: 'byProperty' }],
      },
      Track: {
        name: 'Track',
        plural: 'Tracks',
        description: 'A track',
        properties: { id: stringProp, persistentID: stringProp },
        identifiers: [{ property: 'persistentID', primary: true, targeting: 'byProperty' }],
      },
      Document: {
        name: 'Document',
        plural: 'Documents',
        description: 'A document',
        properties: { name: stringProp },
        identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
      },
      Calendar: {
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: { name: stringProp },
        identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
      },
      Window: {
        name: 'Window',
        plural: 'Windows',
        description: 'A window',
        properties: { name: stringProp },
      },
      Visual: {
        name: 'Visual',
        plural: 'Visuals',
        description: 'A resource with no identifier and no get',
        properties: { name: stringProp },
      },
    },
    enums: {},
    hierarchy: {
      children: {
        items: { resource: 'Item', access: 'r' },
        playlists: {
          resource: 'Playlist',
          access: 'r',
          children: { tracks: { resource: 'Track', access: 'r' } },
        },
        documents: { resource: 'Document', access: 'r' },
        calendars: { resource: 'Calendar', access: 'r' },
        windows: { resource: 'Window', access: 'r' },
        visuals: { resource: 'Visual', access: 'r' },
      },
    },
    relationships: [],
    commands: {
      getItem: resourceCommand('get', 'Item', [param('id')]),
      showItem: resourceCommand('show', 'Item', [param('id')]),
      getPlaylist: resourceCommand('get', 'Playlist', [param('persistentID')]),
      getTrack: resourceCommand('get', 'Track', [param('playlistId'), param('persistentID')], {
        resource: 'Playlist',
        parameter: 'playlistId',
      }),
      getDocument: resourceCommand('get', 'Document', [param('name')]),
      getCalendar: resourceCommand('get', 'Calendar', [param('id')]),
      getWindow: resourceCommand('get', 'Window', [param('name')]),
      showVisual: resourceCommand('show', 'Visual', [param('name')]),
    },
  }
}

const result = generateCliPlugin(buildManifest(), {
  packageName: '@macts/ids',
  sdkPackageName: '@macts/sdk-ids',
})

/** The content of the generated file at a path under the commands directory. */
function command(path: string): string {
  const file = result.files.find((f) => f.path.endsWith(`commands/${path}`))
  if (file === undefined) throw new Error(`no generated command at ${path}`)
  return file.content
}

describe('generated CLI get commands', () => {
  it.each([
    // [command file, description, usage label, identifier shape]
    ['items/get.ts', 'Get an item by ID', 'id'], // primary `id`
    ['playlists/get.ts', 'Get a playlist by persistent ID', 'persistent-id'], // `persistentID`
    ['playlists/tracks/get.ts', 'Get a track by persistent ID', 'persistent-id'], // under a parent
    ['documents/get.ts', 'Get a document by name', 'name'], // `name`
    // The get parameter is `id`, but a calendar is matched on its `name`.
    ['calendars/get.ts', 'Get a calendar by name', 'name'],
    // No declared identifier: the get command's own parameter names it.
    ['windows/get.ts', 'Get a window by name', 'name'],
  ])('%s says "%s" and labels its positional <%s>', (path, description, label) => {
    const content = command(path)
    // The description starts with the summary; a property-matched identifier
    // not claimed unique adds its first-match sentence after it.
    expect(content).toMatch(new RegExp(`description: ['"]${description}['.]`))
    expect(content).toContain(` * ${description}.`)
    expect(content).toMatch(
      new RegExp(`Option\\.String\\(\\{ name: '${label}', required: true \\}\\)`)
    )
  })

  it('keeps the arguments and their order: the parent option, then the identifier', () => {
    const track = command('playlists/tracks/get.ts')
    expect(track).toContain("playlistId = Option.String('--playlist-id'")
    expect(track).toContain("trackId = Option.String({ name: 'persistent-id', required: true })")
    expect(track).toContain('client.tracks.get(this.playlistId, this.trackId)')
    expect(command('playlists/get.ts')).toContain('client.playlists.get(this.playlistId)')
    // The generic wording is gone where the identifier is not `id`.
    expect(command('playlists/get.ts')).not.toContain('by ID')
  })
})

describe('generated CLI resource commands', () => {
  it("label the item's identifier positional the same way", () => {
    const show = command('items/show.ts')
    expect(show).toContain("itemId = Option.String({ name: 'id', required: true })")
  })

  it('leave the positional unlabeled when the resource has no known identifier', () => {
    // No identifier is declared and no get command names one, so the label
    // would be a guess.
    const show = command('visuals/show.ts')
    expect(show).toContain('visualId = Option.String({ required: true })')
  })
})
