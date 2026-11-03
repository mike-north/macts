/**
 * Unit tests for references resolved through an operation that finds objects
 * only within an object of another resource: the table entry's `parents`
 * names that parent for the operation (`get` or `list`).
 *
 * Expected values are written by hand from phases/13 D7 ("Parent-scoped
 * targets"): a reference takes the parent of the operation that resolves it
 * (a single-object reference, a container and an identity-collection entry
 * its resource's `get`; a selector collection its `list`), and must then carry
 * as its container an identity reference to that parent, which is itself read
 * by the same rules. Encoding, decoding, and the wire and SDK schemas (and the
 * JSON Schema derived from the wire schema) all apply it.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7
 * @see https://json-schema.org/draft-07/json-schema-validation#rfc.section.6.5.3
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { IssuePath } from '../issues.js'
import type { ReferenceRegistry, ReferenceScope } from '../references/index.js'
import type { CodecResult, ValueType } from './value-type.js'
import { ValueTypes as t } from './value-types.js'
import { VECTOR_DECODE_CONTEXT } from './vectors/index.js'

const APP = 'music'

/**
 * A music app: tracks are got and listed only within a playlist; playlists
 * and people at the application. A book is found within a shelf, which is
 * found within a library, for a chain of parents. A reminder is got at the
 * application but listed only within a list, so only its collections need a
 * container. A message is got within its mailbox but listed within its
 * account, so each form needs the parent of the operation resolving it.
 */
const REGISTRY: ReferenceRegistry = {
  Playlist: { id: t.string(), get: 'music.playlists.get', list: 'music.playlists.list' },
  Track: {
    id: t.string(),
    get: 'music.tracks.get',
    list: 'music.tracks.list',
    parents: { get: 'Playlist', list: 'Playlist' },
  },
  Person: { id: t.string(), get: 'music.people.get' },
  Library: { id: t.string(), get: 'music.libraries.get' },
  Shelf: { id: t.string(), get: 'music.shelves.get', parents: { get: 'Library' } },
  Book: {
    id: t.string(),
    get: 'music.books.get',
    list: 'music.books.list',
    parents: { get: 'Shelf', list: 'Shelf' },
  },
  List: { id: t.string(), get: 'music.lists.get', list: 'music.lists.list' },
  Reminder: {
    id: t.string(),
    get: 'music.reminders.get',
    list: 'music.reminders.list',
    parents: { list: 'List' },
  },
  Account: { id: t.string(), get: 'music.accounts.get' },
  Mailbox: { id: t.string(), get: 'music.mailboxes.get' },
  Message: {
    id: t.string(),
    get: 'music.messages.get',
    list: 'music.messages.list',
    parents: { get: 'Mailbox', list: 'Account' },
  },
}

const SCOPE: ReferenceScope = { app: APP, resources: REGISTRY }
const scope = (): ReferenceScope => SCOPE

const track = t.reference(scope, 'Track', 'one')
const tracks = t.reference(scope, 'Track', 'many')
const book = t.reference(scope, 'Book', 'one')
const playlist = t.reference(scope, 'Playlist', 'one')
const reminder = t.reference(scope, 'Reminder', 'one')
const reminders = t.reference(scope, 'Reminder', 'many')

/** Identity reference data to `resource`, with an optional container. */
function identity(resource: string, id: string, container?: object): object {
  return {
    app: APP,
    resource,
    form: 'identity',
    cardinality: 'one',
    id,
    ...(container === undefined ? {} : { container }),
  }
}

/** The wire form of {@link identity}. */
function wireIdentity(resource: string, id: string, container?: object): object {
  return {
    resource,
    form: 'identity',
    cardinality: 'one',
    id,
    ...(container === undefined ? {} : { container }),
  }
}

function failures(
  result: CodecResult<unknown>
): { path: IssuePath; code: string | undefined; message: string }[] {
  if (result.ok) throw new Error('expected a failure')
  return result.issues.map(({ path, code, message }) => ({ path, code, message }))
}

const MISSING_PLAYLIST =
  'The required field "container" is missing; expected an identity reference to the ' +
  '"Playlist" the "Track" is in, because the app finds a "Track" only within its "Playlist".'

function wrongContainer(received: string): string {
  return (
    'The app finds a "Track" only within its "Playlist", by that "Playlist"\'s identifier, so ' +
    `the container must be an identity reference to a "Playlist"; received ${received}.`
  )
}

describe('encoding a reference to a parent-scoped resource', () => {
  it('rejects one with no container, naming the parent', () => {
    expect(failures(track.encode(identity('Track', 'T1')))).toEqual([
      { path: ['container'], code: 'missing-field', message: MISSING_PLAYLIST },
    ])
  })

  it('rejects a container naming another resource', () => {
    expect(failures(track.encode(identity('Track', 'T1', identity('Person', 'P1'))))).toEqual([
      {
        path: ['container'],
        code: 'invalid-type',
        message: wrongContainer('a reference to "Person"'),
      },
    ])
  })

  it('rejects a selector container, which supplies no identifier', () => {
    const container = {
      app: APP,
      resource: 'Playlist',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'Road trip' },
    }
    expect(failures(track.encode(identity('Track', 'T1', container)))).toEqual([
      {
        path: ['container'],
        code: 'invalid-type',
        message: wrongContainer('a selector reference to "Playlist"'),
      },
    ])
  })

  it('accepts an identity container of the parent, and writes it to the wire', () => {
    const encoded = track.encode(identity('Track', 'T1', identity('Playlist', 'P1')))
    expect(encoded).toEqual({
      ok: true,
      value: { reference: wireIdentity('Track', 'T1', wireIdentity('Playlist', 'P1')) },
    })
  })

  it('needs the container for a selector reference too', () => {
    const selector = {
      app: APP,
      resource: 'Track',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: 0 },
    }
    expect(failures(track.encode(selector))).toEqual([
      { path: ['container'], code: 'missing-field', message: MISSING_PLAYLIST },
    ])
    expect(track.encode({ ...selector, container: identity('Playlist', 'P1') }).ok).toBe(true)
  })

  it('needs it for each identity-collection entry and for a selector collection', () => {
    const entries = {
      app: APP,
      resource: 'Track',
      form: 'identity',
      cardinality: 'many',
      entries: [identity('Track', 'T1', identity('Playlist', 'P1')), identity('Track', 'T2')],
    }
    expect(failures(tracks.encode(entries))).toEqual([
      { path: ['entries', 1, 'container'], code: 'missing-field', message: MISSING_PLAYLIST },
    ])
    const every = {
      app: APP,
      resource: 'Track',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
    }
    // A selector collection resolves through the list, whose parent is also the playlist.
    expect(failures(tracks.encode(every))).toEqual([
      {
        path: ['container'],
        code: 'missing-field',
        message:
          'The required field "container" is missing; expected an identity reference to the ' +
          '"Playlist" whose "Track" objects are selected, because the app lists "Track" objects ' +
          'only within a "Playlist".',
      },
    ])
    expect(tracks.encode({ ...every, container: identity('Playlist', 'P1') }).ok).toBe(true)
  })

  it('checks a chain of parents level by level', () => {
    expect(failures(book.encode(identity('Book', 'B1', identity('Shelf', 'S1'))))).toEqual([
      {
        path: ['container', 'container'],
        code: 'missing-field',
        message:
          'The required field "container" is missing; expected an identity reference to the ' +
          '"Library" the "Shelf" is in, because the app finds a "Shelf" only within its "Library".',
      },
    ])
    const chain = identity('Book', 'B1', identity('Shelf', 'S1', identity('Library', 'L1')))
    expect(book.encode(chain).ok).toBe(true)
  })

  it('applies to a parent-scoped resource used as any container', () => {
    // A playlist may sit in any resolvable container; a track there still needs its own.
    expect(failures(playlist.encode(identity('Playlist', 'P1', identity('Track', 'T1'))))).toEqual([
      { path: ['container', 'container'], code: 'missing-field', message: MISSING_PLAYLIST },
    ])
  })

  it('leaves a resource found at the application unchanged', () => {
    expect(playlist.encode(identity('Playlist', 'P1')).ok).toBe(true)
  })
})

describe('decoding a reference to a parent-scoped resource', () => {
  it('rejects one with no container', () => {
    const result = track.decode({ reference: wireIdentity('Track', 'T1') }, VECTOR_DECODE_CONTEXT)
    expect(failures(result)).toEqual([
      { path: ['container'], code: 'missing-field', message: MISSING_PLAYLIST },
    ])
  })

  it('accepts one with its parent container', () => {
    const wire = { reference: wireIdentity('Track', 'T1', wireIdentity('Playlist', 'P1')) }
    expect(track.decode(wire, VECTOR_DECODE_CONTEXT).ok).toBe(true)
  })
})

const MISSING_LIST =
  'The required field "container" is missing; expected an identity reference to the ' +
  '"List" whose "Reminder" objects are selected, because the app lists "Reminder" objects ' +
  'only within a "List".'

describe('a reference to a resource listed, but not got, within a parent', () => {
  const every = {
    app: APP,
    resource: 'Reminder',
    form: 'selector',
    cardinality: 'many',
    selector: { by: 'every' },
  }

  it('rejects a selector collection with no container, naming the list parent', () => {
    expect(failures(reminders.encode(every))).toEqual([
      { path: ['container'], code: 'missing-field', message: MISSING_LIST },
    ])
    const range = { ...every, selector: { by: 'range', start: 0, end: 2 } }
    expect(failures(reminders.encode(range))).toEqual([
      { path: ['container'], code: 'missing-field', message: MISSING_LIST },
    ])
  })

  it('rejects a selector collection within another resource', () => {
    expect(failures(reminders.encode({ ...every, container: identity('Person', 'P1') }))).toEqual([
      {
        path: ['container'],
        code: 'invalid-type',
        message:
          'The app lists "Reminder" objects only within a "List", by that "List"\'s ' +
          'identifier, so the container must be an identity reference to a "List"; received a ' +
          'reference to "Person".',
      },
    ])
  })

  it("accepts a selector collection within the list parent's identity", () => {
    expect(reminders.encode({ ...every, container: identity('List', 'L1') }).ok).toBe(true)
  })

  it('needs no container where the get resolves it: one reminder, or identity entries', () => {
    expect(reminder.encode(identity('Reminder', 'R1')).ok).toBe(true)
    const byName = {
      app: APP,
      resource: 'Reminder',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'Call' },
    }
    expect(reminder.encode(byName).ok).toBe(true)
    const entries = {
      app: APP,
      resource: 'Reminder',
      form: 'identity',
      cardinality: 'many',
      entries: [identity('Reminder', 'R1')],
    }
    expect(reminders.encode(entries).ok).toBe(true)
  })

  it('rejects the collection with no container when decoding too', () => {
    const wire = {
      reference: {
        resource: 'Reminder',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'every' },
      },
    }
    expect(failures(reminders.decode(wire, VECTOR_DECODE_CONTEXT))).toEqual([
      { path: ['container'], code: 'missing-field', message: MISSING_LIST },
    ])
  })

  it('requires the container only in the selector collection branch of its JSON Schema', () => {
    const schema = z.toJSONSchema(reminders.wire, { target: 'draft-7' })
    const payload = (schema.properties as Record<string, { anyOf: Record<string, unknown>[] }>)[
      'reference'
    ]
    // Identity collection first, then selector collection (D7, wire forms).
    expect(payload?.anyOf.map((branch) => branch['required'])).toEqual([
      ['resource', 'form', 'cardinality', 'entries'],
      ['resource', 'form', 'cardinality', 'selector', 'container'],
    ])
    const container = (
      payload?.anyOf[1]?.['properties'] as Record<string, Record<string, unknown>>
    )['container']
    expect(container?.['properties']).toMatchObject({
      resource: { type: 'string', const: 'List' },
      form: { type: 'string', const: 'identity' },
    })
    expect(wireAccepts(reminder, { reference: wireIdentity('Reminder', 'R1') })).toBe(true)
  })
})

describe('a resource whose get and list parents differ', () => {
  const message = t.reference(scope, 'Message', 'one')
  const messages = t.reference(scope, 'Message', 'many')
  const every = {
    app: APP,
    resource: 'Message',
    form: 'selector',
    cardinality: 'many',
    selector: { by: 'every' },
  }

  it("takes the get's parent for a single reference, an entry, and a container", () => {
    expect(message.encode(identity('Message', 'M1', identity('Mailbox', 'X1'))).ok).toBe(true)
    expect(failures(message.encode(identity('Message', 'M1', identity('Account', 'A1'))))).toEqual([
      {
        path: ['container'],
        code: 'invalid-type',
        message:
          'The app finds a "Message" only within its "Mailbox", by that "Mailbox"\'s ' +
          'identifier, so the container must be an identity reference to a "Mailbox"; ' +
          'received a reference to "Account".',
      },
    ])
    const entries = {
      app: APP,
      resource: 'Message',
      form: 'identity',
      cardinality: 'many',
      entries: [identity('Message', 'M1', identity('Account', 'A1'))],
    }
    expect(failures(messages.encode(entries)).map(({ path }) => path)).toEqual([
      ['entries', 0, 'container'],
    ])
    const inMessage = identity(
      'Playlist',
      'P1',
      identity('Message', 'M1', identity('Account', 'A1'))
    )
    expect(failures(playlist.encode(inMessage)).map(({ path }) => path)).toEqual([
      ['container', 'container'],
    ])
  })

  it("takes the list's parent for a selector collection", () => {
    expect(messages.encode({ ...every, container: identity('Account', 'A1') }).ok).toBe(true)
    expect(
      failures(messages.encode({ ...every, container: identity('Mailbox', 'X1') })).map(
        ({ message: text }) => text
      )
    ).toEqual([
      'The app lists "Message" objects only within a "Account", by that "Account"\'s ' +
        'identifier, so the container must be an identity reference to a "Account"; received a ' +
        'reference to "Mailbox".',
    ])
  })
})

/** Whether `type`'s wire schema accepts `wire`. */
function wireAccepts(type: ValueType<unknown>, wire: unknown): boolean {
  return type.wire.safeParse(wire).success
}

describe('the wire and SDK schemas of a parent-scoped reference', () => {
  it('reject what encoding rejects, and accept what it accepts', () => {
    expect(wireAccepts(track, { reference: wireIdentity('Track', 'T1') })).toBe(false)
    expect(
      wireAccepts(track, { reference: wireIdentity('Track', 'T1', wireIdentity('Person', 'P1')) })
    ).toBe(false)
    expect(
      wireAccepts(track, { reference: wireIdentity('Track', 'T1', wireIdentity('Playlist', 'P1')) })
    ).toBe(true)
    expect(track.sdk.safeParse(identity('Track', 'T1')).success).toBe(false)
    expect(track.sdk.safeParse(identity('Track', 'T1', identity('Playlist', 'P1'))).success).toBe(
      true
    )
  })

  it('require the parent container in JSON Schema', () => {
    const schema = z.toJSONSchema(track.wire, { target: 'draft-7' })
    const payload = (schema.properties as Record<string, { anyOf: Record<string, unknown>[] }>)[
      'reference'
    ]
    // One branch per form, identity then selector; each requires its container.
    expect(payload?.anyOf.map((branch) => branch['required'])).toEqual([
      ['resource', 'form', 'cardinality', 'id', 'container'],
      ['resource', 'form', 'cardinality', 'selector', 'container'],
    ])
    const container = (
      payload?.anyOf[0]?.['properties'] as Record<string, Record<string, unknown>>
    )['container']
    expect(container?.['properties']).toMatchObject({
      resource: { type: 'string', const: 'Playlist' },
      form: { type: 'string', const: 'identity' },
    })
  })

  it('keep the container optional for a resource found at the application', () => {
    const schema = z.toJSONSchema(playlist.wire, { target: 'draft-7' })
    const payload = (schema.properties as Record<string, { anyOf: Record<string, unknown>[] }>)[
      'reference'
    ]
    expect(payload?.anyOf.map((branch) => branch['required'])).toEqual([
      ['resource', 'form', 'cardinality', 'id'],
      ['resource', 'form', 'cardinality', 'selector'],
    ])
  })
})
