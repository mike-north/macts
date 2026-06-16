/**
 * Shared test fixtures for capability-discovery tests.
 *
 * Provides a small, hand-written manifest exercising every command scope and
 * risk class, so registry/search/governance tests can assert against a known,
 * spec-derived shape rather than a real (large) app manifest.
 *
 * @packageDocumentation
 */

import { parseManifestYaml } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/index.js'

/** YAML tag — identity pass-through for editor/lint support. */
const yaml = String.raw

/**
 * A compact two-resource manifest for the fictional "Notebook" app:
 * - `notes` resource: list (read), create (write), delete (delete), send (send)
 * - app-scoped: doScript (execute), quit (system-change)
 *
 * Every risk class is represented exactly once, with deterministic operation
 * names, so tests can hand-derive expected classifications and orderings.
 */
export const NOTEBOOK_MANIFEST_YAML = yaml`
version: '1.0'
app:
  bundleId: com.example.notebook
  name: Notebook
  displayName: Notebook
resources:
  Note:
    name: Note
    plural: Notes
    description: A note in the notebook
    identifiers:
      - property: id
        primary: true
    properties:
      id:
        access: r
        type: string
        description: Unique note identifier
      title:
        access: rw
        type: string
        description: The note title
      body:
        access: rw
        type: string
        description: The note body text
hierarchy:
  children:
    notes:
      resource: Note
      access: rw
      description: Notes in the notebook
commands:
  listNotes:
    name: list
    description: List all notes
    scope: resource
    resourceType: Note
    parameters: []
    permission: notebook:notes:list
  createNote:
    name: create
    description: Create a new note
    scope: resource
    resourceType: Note
    parameters:
      - name: title
        type: string
        description: The note title
        required: true
    permission: notebook:notes:create
  deleteNote:
    name: delete
    description: Delete a note
    scope: resource
    resourceType: Note
    parameters: []
    permission: notebook:notes:delete
  shareNote:
    name: share
    description: Share a note with someone
    scope: resource
    resourceType: Note
    parameters:
      - name: recipient
        type: string
        description: Recipient address
        required: true
    permission: notebook:notes:share
  doScript:
    name: doScript
    description: Run a script in the app
    scope: application
    parameters:
      - name: source
        type: string
        description: Script source
        required: true
    permission: notebook:app:doScript
  quit:
    name: quit
    description: Quit the application
    scope: application
    parameters: []
`

/**
 * Parse the Notebook fixture into a validated manifest.
 *
 * @returns The Notebook {@link AppManifest}
 */
export function notebookManifest(): AppManifest {
  return parseManifestYaml(NOTEBOOK_MANIFEST_YAML)
}
