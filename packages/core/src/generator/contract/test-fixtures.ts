/**
 * Shared test fixture for app-contract generation tests.
 *
 * A small hand-written manifest for the fictional "Jotter" app, built to
 * exercise every case the contract must handle, so tests can derive expected
 * output by hand from it rather than from a large real manifest:
 *
 * - `Note` and `Folder` reference each other (a note's `folder`, a folder's
 *   `notes`), which the lazy resource table must allow.
 * - `Tag` has no identifier, so it can be referenced only by selector, and no
 *   get operation, so a single tag cannot be referenced at all; tags can be
 *   listed, so a collection of them can.
 * - `Folder` can be got and listed, so it can be referenced and can contain.
 * - `Sticker` has neither a get nor a list operation, so no reference to one
 *   can be resolved and the resource table leaves it out; a folder's
 *   `sticker` field still names it, so a reference to one is rejected.
 * - `Note.uid` is claimed unique and notes record a supported range read, so
 *   the note list pages; `Folder.folderId`
 *   makes no uniqueness claim and `Tag` has no identifier, so their lists
 *   return their whole collection as one page.
 * - `Priority` is an enum, named in lower case by a property (`{ enum:
 *   priority }`), so it resolves only by normalized name.
 * - `Note.attachment` is a file property (a file value when read), and
 *   `createNote` takes a `file` parameter (a file source when written).
 * - `getNote` identifies a note by the parameter `noteId`, whose name differs
 *   from the note's identifier property `uid`.
 * - `updateNote` takes a parent scope (`folderId`, an integer) and the note;
 *   it and `createNote` record the folder as their parent.
 * - `archive` is a non-CRUD resource command with an explicit permission.
 * - `moveNote` takes a reference parameter (`destination`, a folder), an
 *   input position typed by the reference's data form.
 * - `quit` is an app command with an optional parameter.
 * - `wordTotal` is an app command with a result, which is nullable by default.
 *
 * Nullability and resettability (one case each):
 *
 * - `Note.uid` is the primary identifier, never null by structure.
 * - `Note.title` and `Tag.name` are curated non-null.
 * - `Note.created` was observed missing by a probe (nullable).
 * - `Note.wordCount` was observed set in every item by a probe (non-null).
 * - `Folder.color` is declared nullable by the app's scripting dictionary.
 * - `Note.rating`, `Tag.label`, `Note.folder` (a reference), and
 *   `Folder.notes` (a list) make no claim, so they are nullable by default.
 * - `Note.priority` is curated resettable, so an update may reset it with
 *   `null`; `Note.rating` is not, so an update rejects `null`.
 * - `archive`'s optional `until` parameter is curated nullable; every other
 *   parameter does not accept `null`.
 *
 * @packageDocumentation
 */

import { parseManifestYaml } from '../../manifest/loader.js'
import type { AppManifest } from '../../manifest/index.js'

/** YAML tag: identity pass-through for editor support. */
const yaml = String.raw

/** The Jotter manifest, as YAML. */
export const JOTTER_MANIFEST_YAML = yaml`
version: '1.0'
app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties:
      uid:
        access: r
        type: string
        description: The note's unique identifier
      title:
        access: rw
        type: string
        description: The note's title
        nullable: false
        evidence:
          nullable:
            source: curated
            note: Jotter refuses to save a note without a title
      priority:
        access: rw
        type: { enum: priority }
        description: How urgent the note is
        optional: true
        resettable: true
        evidence:
          resettable:
            source: curated
            note: jotter-reset.test.ts clears the priority of a scratch note
            appVersion: '2.1'
      folder:
        access: r
        type: { resource: folder }
        description: The folder holding the note
      attachment:
        access: r
        type: file
        description: The note's attachment
        optional: true
      created:
        access: r
        type: date
        description: When the note was created
        nullable: true
        evidence:
          nullable:
            source: probe
            observedAt: '2026-10-31T12:00:00.000Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 40
            nullCount: 3
            failedReads: 0
      wordCount:
        access: r
        type: integer
        description: How many words the note has
        nullable: false
        evidence:
          nullable:
            source: probe
            observedAt: '2026-10-31T12:00:00.000Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 40
            nullCount: 0
            failedReads: 2
      rating:
        access: rw
        type: number
        description: The note's rating
        optional: true
    identifiers:
      - property: uid
        primary: true
        unique: true
        evidence:
          unique:
            source: sdef
            note: The dictionary describes uid as the note's unique identifier
    rangeRead:
      supported: true
      read: range
      evidence:
        source: probe
        observedAt: '2026-10-31T12:00:00.000Z'
        bundleId: com.example.jotter
        appVersion: '2.1'
        osVersion: '27.2'
        pageMs: 400
        columnMs: 900
        items: 120
  Folder:
    name: Folder
    plural: Folders
    description: A folder of notes
    properties:
      folderId:
        access: r
        type: integer
        description: The folder's identifier
      title:
        access: rw
        type: string
        description: The folder's title
      notes:
        access: r
        type: { array: { resource: Note } }
        description: The notes in the folder
      owner:
        access: r
        type: { resource: tag }
        description: The tag that owns the folder
        optional: true
      sticker:
        access: r
        type: { resource: Sticker }
        description: The sticker on the folder
        optional: true
      color:
        access: r
        type: string
        description: The folder's color
        nullable: true
        evidence:
          nullable:
            source: sdef
            note: folder color is declared as text or missing value
    identifiers:
      - property: folderId
        primary: true
  Tag:
    name: Tag
    plural: Tags
    description: A tag
    properties:
      label:
        access: r
        type: string
        description: The tag's label
      name:
        access: r
        type: string
        description: The tag's name
        nullable: false
        evidence:
          nullable:
            source: curated
            note: Jotter names every tag when it is created
  Sticker:
    name: Sticker
    plural: Stickers
    description: A sticker
    properties:
      label:
        access: r
        type: string
        description: The sticker's label
enums:
  Priority:
    name: Priority
    description: How urgent a note is
    values:
      - name: low
        value: low
      - name: high
        value: high
hierarchy:
  children: {}
commands:
  listNotes:
    name: list
    description: List notes
    scope: resource
    resourceType: Note
  getNote:
    name: get
    description: Get a note
    scope: resource
    resourceType: Note
    parameters:
      - name: noteId
        type: string
        description: The note to read
  createNote:
    name: create
    description: Create a note
    scope: resource
    resourceType: Note
    parent:
      resource: Folder
      parameter: folderId
    parameters:
      - name: folderId
        type: integer
        description: The folder to create the note in
      - name: title
        type: string
        description: The new note's title
      - name: attachment
        type: file
        description: A file to attach
        required: false
  updateNote:
    name: update
    description: Update a note
    scope: resource
    resourceType: Note
    parent:
      resource: Folder
      parameter: folderId
    parameters:
      - name: folderId
        type: integer
        description: The folder holding the note
      - name: noteId
        type: string
        description: The note to update
      - name: title
        type: string
        description: The new title
        required: false
  deleteNote:
    name: delete
    description: Delete a note
    scope: resource
    resourceType: Note
    parameters:
      - name: noteId
        type: string
        description: The note to delete
  archive:
    name: archive
    description: Archive a note
    scope: resource
    resourceType: Note
    permission: 'jotter:notes:write'
    parameters:
      - name: noteId
        type: string
        description: The note to archive
      - name: until
        type: date
        description: When to unarchive it
        required: false
        nullable: true
        evidence:
          nullable:
            source: curated
            note: null keeps the note archived indefinitely
  moveNote:
    name: move
    description: Move a note to another folder
    scope: resource
    resourceType: Note
    parameters:
      - name: noteId
        type: string
        description: The note to move
      - name: destination
        type: { resource: Folder }
        description: The folder to move the note to
  listFolders:
    name: list
    description: List folders
    scope: resource
    resourceType: Folder
  getFolder:
    name: get
    description: Get a folder
    scope: resource
    resourceType: Folder
    parameters:
      - name: folderId
        type: integer
        description: The folder to read
  listTags:
    name: list
    description: List tags
    scope: resource
    resourceType: Tag
  quit:
    name: quit
    description: Quit Jotter
    scope: application
    parameters:
      - name: saving
        type: boolean
        description: Whether to save first
        required: false
  wordTotal:
    name: wordTotal
    description: Count the words in every note
    scope: application
    returns: integer
`

/** The validated Jotter manifest. */
export function jotterManifest(): AppManifest {
  return parseManifestYaml(JOTTER_MANIFEST_YAML)
}

/**
 * Jotter with input positions that admit no value, one case each. A tag has no
 * `get`, so no single reference to one can be resolved (phases/13 D7,
 * "Resolvable targets"):
 *
 * - `tagNote` requires a `tag`, so the operation can never be called.
 * - `exportNotes` takes an optional `tagged`, which is left out; its optional
 *   `untaggedOr` also admits `null`, so it stays.
 * - `Note.primaryTag` is a writable reference to a tag, so it is left out of
 *   the create and update inputs; `Note.relatedTags` is a list of tags, which
 *   may be empty, so it stays.
 *
 * Notes are in the hierarchy, so the CLI generator emits their commands.
 */
export const JOTTER_UNSATISFIABLE_INPUTS_YAML = JOTTER_MANIFEST_YAML.replace(
  `hierarchy:
  children: {}
`,
  `hierarchy:
  children:
    notes:
      resource: Note
      access: rw
      description: Jotter notes
`
).replace(
  `        description: The note's rating
        optional: true
`,
  `        description: The note's rating
        optional: true
      primaryTag:
        access: rw
        type: { resource: Tag }
        description: The note's primary tag
        optional: true
      relatedTags:
        access: rw
        type: { array: { resource: Tag } }
        description: Tags related to the note
        optional: true
`
).concat(yaml`  tagNote:
    name: tag
    description: Tag a note
    scope: resource
    resourceType: Note
    parameters:
      - name: noteId
        type: string
        description: The note to tag
      - name: tag
        type: { resource: Tag }
        description: The tag to add
  exportNotes:
    name: exportNotes
    description: Export notes
    scope: application
    parameters:
      - name: format
        type: string
        description: The export format
      - name: tagged
        type: { resource: Tag }
        description: Export only the notes with this tag
        required: false
      - name: untaggedOr
        type: { resource: Tag }
        description: Export the notes with this tag, or the untagged ones when null
        required: false
        nullable: true
        evidence:
          nullable:
            source: curated
            note: null selects the notes that have no tag
`)

/** The validated Jotter manifest with input positions that admit no value. */
export function jotterUnsatisfiableInputsManifest(): AppManifest {
  if (
    !JOTTER_UNSATISFIABLE_INPUTS_YAML.includes('primaryTag') ||
    !JOTTER_UNSATISFIABLE_INPUTS_YAML.includes('description: Jotter notes')
  ) {
    throw new Error('the Jotter fixture no longer has the anchors this variant edits')
  }
  return parseManifestYaml(JOTTER_UNSATISFIABLE_INPUTS_YAML)
}
