/**
 * Tests that every hierarchy entry names a declared resource.
 *
 * The hierarchy records the app's element containment, and the command-parent
 * guard and the output reference rule both read it to decide which resources
 * the app holds only within a container (`../hierarchy-placement.ts`). An
 * entry whose `resource` is not a key of `resources` places nothing, so a
 * misspelt key would silently turn off both containment checks for the
 * resource it meant. Expected outcomes are written by hand from that rule:
 * each rejection names the entry's path and the value, at any depth, and
 * every shipped manifest still loads (`../loader.test.ts`).
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D7, D10)
 */

import { describe, expect, it } from 'vitest'
import { AppManifestSchema } from './app.js'

/** A minimal resource named `name`. */
const resource = (name: string): Record<string, unknown> => ({
  name,
  plural: `${name}s`,
  description: `A ${name.toLowerCase()}`,
  properties: { name: { access: 'r', type: 'string', description: 'The name' } },
})

/** A Library manifest with Shelf and Book resources and the given hierarchy. */
function library(children: Record<string, unknown>): unknown {
  return {
    version: '1.0',
    app: { name: 'Library', bundleId: 'com.example.library' },
    resources: { Shelf: resource('Shelf'), Book: resource('Book') },
    hierarchy: { children },
  }
}

/** The issues of parsing `manifest`, as path and message. */
function issues(manifest: unknown): { path: PropertyKey[]; message: string }[] {
  const result = AppManifestSchema.safeParse(manifest)
  return result.success ? [] : result.error.issues.map(({ path, message }) => ({ path, message }))
}

describe('hierarchy entries name declared resources', () => {
  it('accepts entries that name declared resources, at every depth', () => {
    expect(
      issues(
        library({
          shelves: {
            resource: 'Shelf',
            access: 'r',
            children: { books: { resource: 'Book', access: 'r' } },
          },
        })
      )
    ).toEqual([])
  })

  it('rejects a misspelt resource key, which would otherwise silently turn off the containment checks', () => {
    expect(
      issues(
        library({
          shelves: {
            resource: 'Shelf',
            access: 'r',
            children: { books: { resource: 'book', access: 'r' } },
          },
        })
      )
    ).toEqual([
      {
        path: ['hierarchy', 'children', 'shelves', 'children', 'books', 'resource'],
        message: expect.stringMatching(
          /^hierarchy\.children\.shelves\.children\.books\.resource: "book" is not a resource the manifest declares/
        ) as unknown as string,
      },
    ])
  })

  it('rejects an unknown resource at the top level, naming its path and value', () => {
    expect(issues(library({ things: { resource: 'NoSuchThing', access: 'r' } }))).toEqual([
      {
        path: ['hierarchy', 'children', 'things', 'resource'],
        message: expect.stringMatching(
          /^hierarchy\.children\.things\.resource: "NoSuchThing" is not a resource the manifest declares/
        ) as unknown as string,
      },
    ])
  })

  it('rejects a resource matched only by its plural, since it must be a resource key', () => {
    expect(
      issues(library({ shelves: { resource: 'Shelfs', access: 'r' } })).map(({ path }) => path)
    ).toEqual([['hierarchy', 'children', 'shelves', 'resource']])
  })
})
