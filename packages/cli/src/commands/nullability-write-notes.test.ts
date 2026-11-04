/**
 * The lines `macts probe --nullability` prints after writing the manifest:
 * every claim the probe decided on and the writer could not place is named,
 * and the "Wrote" line is never the only word on a dropped claim.
 */

import { describe, expect, it } from 'vitest'
import { nullabilityWriteNotes } from './nullability-write-notes.js'

const PATH = '/manifests/catalog/app.yaml'

describe('nullabilityWriteNotes', () => {
  it('says only that the evidence was written when every claim was', () => {
    expect(nullabilityWriteNotes(PATH, { keptEarlierBlocks: [], notWritten: [] })).toEqual([
      'Wrote nullability evidence to /manifests/catalog/app.yaml\n',
    ])
  })

  it('names the resources that kept an earlier probe record', () => {
    expect(
      nullabilityWriteNotes(PATH, { keptEarlierBlocks: ['Note', 'Folder'], notWritten: [] })
    ).toEqual([
      'Wrote nullability evidence to /manifests/catalog/app.yaml\n',
      'Kept the earlier nullability probe record for Note, Folder: this probe read no items there.\n',
    ])
  })

  it('names each claim that was not written, with its reason, in order', () => {
    expect(
      nullabilityWriteNotes(PATH, {
        keptEarlierBlocks: [],
        notWritten: [
          { resource: 'Book', property: 'pages', reason: 'not-declared' },
          { resource: 'Item', property: 'size', reason: 'evidence-not-mapping' },
        ],
      })
    ).toEqual([
      'Wrote nullability evidence to /manifests/catalog/app.yaml\n',
      'Did not write the nullability claim for Book.pages: Book neither declares nor inherits "pages".\n',
      'Did not write the nullability claim for Item.size: its evidence is not a mapping, so the claim cannot be added.\n',
    ])
  })
})
