/**
 * The resources whose resolving routes find objects only within a parent, as
 * audited by hand against the manifests (phases/13 D7, "Parent-scoped
 * targets"). Tests over the shipped contracts share these pins, so a route
 * gaining or losing a parent is reviewed in one place.
 */

/** `[app, resource, parent]`, pinned once per resource that records the parent. */
export type Pin = readonly [app: string, resource: string, parent: string]

/**
 * Resources whose `get` and `list` both record the parent: calendar
 * `getEvent`/`listEvents`; contacts `getAddress`/`listAddresses`,
 * `getEmail`/`listEmails` and `getPhone`/`listPhones`; music
 * `getTrack`/`listTracks`; tv `getPlaylist`/`listPlaylists`.
 */
export const BOTH_ROUTE_PINS: readonly Pin[] = [
  ['calendar', 'Event', 'Calendar'],
  ['contacts', 'Address', 'Person'],
  ['contacts', 'Email', 'Person'],
  ['contacts', 'Phone', 'Person'],
  ['music', 'Track', 'Playlist'],
  ['tv', 'Playlist', 'Source'],
]

/**
 * Resources whose `list` alone records the parent; their gets work at the
 * application (Edge, OmniGraffle and Xcode await #173), and Automator's
 * settings and required resources have no get. A collection of these is a
 * selector collection that needs its parent as its container.
 */
export const LIST_ONLY_PINS: readonly Pin[] = [
  ['automator', 'AutomatorAction', 'Workflow'],
  ['automator', 'Variable', 'Workflow'],
  ['automator', 'Setting', 'AutomatorAction'],
  ['automator', 'RequiredResource', 'AutomatorAction'],
  ['microsoft-edge', 'Tab', 'Window'],
  ['microsoft-edge', 'BookmarkItem', 'BookmarkFolder'],
  ['omnigraffle', 'Graphic', 'Canvas'],
  ['omnigraffle', 'Shape', 'Canvas'],
  ['omnigraffle', 'Line', 'Canvas'],
  ['omnigraffle', 'Layer', 'Canvas'],
  ['reminders', 'Reminder', 'List'],
  ['xcode', 'Project', 'WorkspaceDocument'],
  ['xcode', 'Scheme', 'WorkspaceDocument'],
  ['xcode', 'RunDestination', 'WorkspaceDocument'],
]
