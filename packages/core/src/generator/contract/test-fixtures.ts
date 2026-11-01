/**
 * Shared test fixture for app-contract generation tests.
 *
 * A small hand-written manifest for the fictional "Jotter" app, built to
 * exercise every case the contract must handle, so tests can derive expected
 * output by hand from it rather than from a large real manifest:
 *
 * - `Note` and `Folder` reference each other (a note's `folder`, a folder's
 *   `notes`), which the lazy resource table must allow.
 * - `Tag` has no identifier, so it can be referenced only by selector.
 * - `Priority` is an enum, named in lower case by a property (`{ enum:
 *   priority }`), so it resolves only by normalized name.
 * - `Note.attachment` is a file property (a file value when read), and
 *   `createNote` takes a `file` parameter (a file source when written).
 * - `getNote` identifies a note by the parameter `noteId`, whose name differs
 *   from the note's identifier property `uid`.
 * - `updateNote` takes a parent scope (`folderId`, an integer) and the note.
 * - `archive` is a non-CRUD resource command with an explicit permission.
 * - `quit` is an app command with an optional parameter.
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
      priority:
        access: rw
        type: { enum: priority }
        description: How urgent the note is
        optional: true
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
      wordCount:
        access: r
        type: integer
        description: How many words the note has
      rating:
        access: rw
        type: number
        description: The note's rating
        optional: true
    identifiers:
      - property: uid
        primary: true
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
  listFolders:
    name: list
    description: List folders
    scope: resource
    resourceType: Folder
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
`

/** The validated Jotter manifest. */
export function jotterManifest(): AppManifest {
  return parseManifestYaml(JOTTER_MANIFEST_YAML)
}
