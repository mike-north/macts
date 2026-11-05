/**
 * The "Archive" fixture: a small hand-written manifest exercising the two
 * addressing forms that are neither the app's id specifier nor a property
 * match (phases/13 D10, "Identifier targeting" and "Singleton roots").
 *
 * Resources:
 *
 * - `Volume` is found by its id (`byId`), at the application.
 * - `Entry` is found by the app's key specifier (`byKey`), keyed by its
 *   `location`: the value names where the entry is, and the app interprets
 *   it. Its get and list address it at the application.
 * - `Mark` is keyed by its `location` too, but is found within its volume:
 *   its get records the volume as parent, so the key lookup is nested.
 * - `Label` is found by its id within its entry: its get records the entry as
 *   parent, so the parent is found by key.
 * - `Desk` is a singleton root with two kinds: the app holds its front desk
 *   as its `frontDesk` property and its back desk as `backDesk`. A desk is
 *   identified by its kind, got by kind, and listed one record per kind the
 *   app has.
 *
 * Positions that reference the root: `Volume.desk`, an output field whose
 * kind no curated mapping names, and the `ring` command's `desk` parameter,
 * an input reference by kind.
 *
 * Absence (phases/13 D10, nullability evidence): `Entry.shelfMark` and
 * `Desk.bell` claim nullable with probe evidence whose failed reads all found
 * no such object, so such a read is an empty value. `Entry.summary` makes no
 * claim, so a failed read of it is not.
 */

import { parseManifestYaml } from '../loader.js'
import type { AppManifest } from '../schemas/index.js'

/** YAML tag: identity pass-through for editor support. */
const yaml = String.raw

/** The Archive manifest, as YAML. */
export const ARCHIVE_MANIFEST_YAML = yaml`
version: '1.0'
app:
  bundleId: com.example.archive
  name: Archive
  tccEntitlements: []
resources:
  Volume:
    name: Volume
    plural: Volumes
    description: A volume of the archive
    properties:
      id:
        access: r
        type: string
        description: The volume's identifier
      title:
        access: r
        type: string
        description: The volume's title
      desk:
        access: r
        type: { resource: Desk }
        description: The desk the volume is checked out at
    identifiers:
      - property: id
        primary: true
        targeting: byId
  Entry:
    name: Entry
    plural: Entries
    description: An entry in the archive
    properties:
      location:
        access: r
        type: string
        description: Where the entry is kept
      title:
        access: r
        type: string
        description: The entry's title
      holder:
        access: r
        type: { resource: Entry }
        description: The entry that holds this one
      shelfMark:
        access: r
        type: string
        description: The shelf mark, on entries that have been shelved
        nullable: true
        evidence:
          nullable:
            source: probe
            observedAt: '2026-11-01T12:00:00.000Z'
            bundleId: com.example.archive
            appVersion: '1.0'
            osVersion: '27.2'
            sampleSize: 3
            nullCount: 0
            failedReads: 2
            errorNumbers: [-1728]
      summary:
        access: r
        type: string
        description: The entry's summary
    identifiers:
      - property: location
        primary: true
        targeting: byKey
  Mark:
    name: Mark
    plural: Marks
    description: A mark within a volume
    properties:
      location:
        access: r
        type: string
        description: Where the mark is, within its volume
    identifiers:
      - property: location
        primary: true
        targeting: byKey
  Label:
    name: Label
    plural: Labels
    description: A label on an entry
    properties:
      id:
        access: r
        type: string
        description: The label's identifier
      text:
        access: r
        type: string
        description: The label's text
    identifiers:
      - property: id
        primary: true
        targeting: byId
  Desk:
    name: Desk
    plural: Desks
    description: A desk of the archive
    properties:
      clerk:
        access: r
        type: string
        description: The clerk on duty
      featured:
        access: r
        type: { resource: Entry }
        description: The entry on display
      bell:
        access: r
        type: string
        description: The desk's bell, on desks that have one
        nullable: true
        evidence:
          nullable:
            source: probe
            observedAt: '2026-11-01T12:00:00.000Z'
            bundleId: com.example.archive
            appVersion: '1.0'
            osVersion: '27.2'
            sampleSize: 1
            nullCount: 0
            failedReads: 1
            errorNumbers: [-1728]
    roots:
      front:
        property: frontDesk
        evidence:
          source: dictionary
          bundleId: com.example.archive
          appVersion: '1.0'
          osVersion: '27.2'
          term: front desk
      back:
        property: backDesk
        evidence:
          source: dictionary
          bundleId: com.example.archive
          appVersion: '1.0'
          osVersion: '27.2'
          term: back desk
enums: {}
hierarchy:
  children:
    volumes:
      resource: Volume
      access: r
      description: Volumes
commands:
  getVolume:
    name: get
    description: Get a volume
    scope: resource
    resourceType: Volume
    parameters:
      - name: id
        type: string
        description: The volume to read
  listVolumes:
    name: list
    description: List volumes
    scope: resource
    resourceType: Volume
  getEntry:
    name: get
    description: Get an entry
    scope: resource
    resourceType: Entry
    parameters:
      - name: location
        type: string
        description: Where the entry is kept
  listEntries:
    name: list
    description: List entries
    scope: resource
    resourceType: Entry
  getMark:
    name: get
    description: Get a mark within its volume
    scope: resource
    resourceType: Mark
    parent:
      resource: Volume
      parameter: volumeId
    parameters:
      - name: volumeId
        type: string
        description: The volume holding the mark
      - name: location
        type: string
        description: Where the mark is, within its volume
  getLabel:
    name: get
    description: Get a label on its entry
    scope: resource
    resourceType: Label
    parent:
      resource: Entry
      parameter: entryLocation
    parameters:
      - name: entryLocation
        type: string
        description: Where the labelled entry is kept
      - name: id
        type: string
        description: The label to read
  getDesk:
    name: get
    description: Get a desk by its kind
    scope: resource
    resourceType: Desk
    parameters:
      - name: kind
        type: { enum: DeskKind }
        description: Which desk
  listDesks:
    name: list
    description: List the desks the archive has
    scope: resource
    resourceType: Desk
  ring:
    name: ring
    description: Ring a desk's bell
    scope: application
    parameters:
      - name: desk
        type: { resource: Desk }
        description: The desk to ring
`

/** The validated Archive manifest. */
export function archiveManifest(): AppManifest {
  return parseManifestYaml(ARCHIVE_MANIFEST_YAML)
}
