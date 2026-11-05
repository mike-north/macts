/**
 * The "Panes" fixture: a small hand-written manifest with a positional
 * resource, whose objects have no identifier and are found by their
 * zero-based position within their parent (phases/13 D7, D10).
 *
 * - `Window` is identified by its dictionary id (code `ID  `), an integer,
 *   and is got at the application.
 * - `Tab` is marked `positional`, with curated evidence: it has no
 *   identifier, and its get and list record Window as their parent. Its get
 *   selects a tab by its integer `index` parameter. Its dictionary `index`
 *   property is deliberately not that position (it counts from 1), so a test
 *   can tell a position taken from the specifier from one read from it.
 * - `Window.currentTab` references a Tab: kept at output, since a native
 *   read hands the tab over with the window record it was read through, and
 *   emitted as an index selector within that window.
 * - `frontTab`, an application command, returns a Tab: left out, since no
 *   window record carries the tab there (parent-scoped).
 */

import { parseManifestYaml } from '../loader.js'
import type { AppManifest } from '../schemas/index.js'

/** YAML tag: identity pass-through for editor support. */
const yaml = String.raw

/** The Panes manifest, as YAML. */
export const PANES_MANIFEST_YAML = yaml`
version: '1.0'
app:
  bundleId: com.example.panes
  name: Panes
  tccEntitlements: []
resources:
  Window:
    name: Window
    plural: Windows
    description: A window
    properties:
      id:
        access: r
        type: integer
        description: The window's identifier
        code: 'ID  '
      name:
        access: r
        type: string
        description: The window's title
      currentTab:
        access: r
        type: { resource: Tab }
        description: The tab shown in the window
    identifiers:
      - property: id
        primary: true
  Tab:
    name: Tab
    plural: Tabs
    description: A tab of a window
    positional:
      evidence:
        source: curated
        note: A tab has no id property; the app addresses a tab only by its position within its window.
        observedAt: '2026-11-01T12:00:00.000Z'
        appVersion: '1.0'
    properties:
      index:
        access: r
        type: integer
        description: The tab's index, counted from 1
        code: pidx
      title:
        access: r
        type: string
        description: The tab's title
enums: {}
hierarchy:
  children:
    windows:
      resource: Window
      access: r
      description: The windows
      children:
        tabs:
          resource: Tab
          access: r
          description: The tabs of the window
commands:
  listWindows:
    name: list
    description: List the windows
    scope: resource
    resourceType: Window
  getWindow:
    name: get
    description: Get a window
    scope: resource
    resourceType: Window
    parameters:
      - name: id
        type: integer
        description: The window to read
        required: true
  listTabs:
    name: list
    description: List the tabs of a window
    scope: resource
    resourceType: Tab
    parent:
      resource: Window
      parameter: windowId
    parameters:
      - name: windowId
        type: integer
        description: The window holding the tabs
        required: true
  getTab:
    name: get
    description: Get a tab of a window
    scope: resource
    resourceType: Tab
    parent:
      resource: Window
      parameter: windowId
    parameters:
      - name: windowId
        type: integer
        description: The window holding the tab
        required: true
      - name: index
        type: integer
        description: The tab to read
        required: true
  frontTab:
    name: frontTab
    description: The tab in front
    scope: application
    returns: Tab
`

/** The validated Panes manifest. */
export function panesManifest(): AppManifest {
  return parseManifestYaml(PANES_MANIFEST_YAML)
}
