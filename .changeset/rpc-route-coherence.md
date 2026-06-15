---
'@macts/core': minor
'@macts/api': patch
---

Make the client SDK and server router address every RPC operation with the same route

The generated client SDK and the server router are both produced from the manifest,
but they keyed RPC routes differently for manifest-named commands: the server used the
command's manifest **key** (e.g. `createEvent`) while the client used the command's
**name** (`create`). As a result, structured writes were unreachable —
`@macts/calendar` `events.create()` posted to `calendar.events.create` and the server
(which exposed `calendar.events.createEvent`) returned `404 NOT_FOUND`. Multi-word apps
drifted too: the server kept the space (`google chrome`) while the client hyphenated
(`google-chrome`), breaking every route for those apps.

**Single source of truth (`@macts/core`):** a new route module derives the canonical
`app.resource.operation` string (keyed by the command's manifest key, with a normalized
app segment) and is used by both surfaces — the SDK generator emits it as a literal and
the server router registers it at runtime. New generator-level tests assert, for every
manifest operation across every app, that the client route equals the route the server
exposes.

**Reachable surface only:** the SDK now emits a CRUD method only when a backing manifest
command exists (routing it by that command's key), and omits resource clients for
resources that declare no operations — eliminating methods that always 404'd.

**Identifier reconciliation:** a resource's create-input type now includes the backing
create command's parameters, so identifiers the server requires (e.g. an Event's
`calendarId`) are surfaced under the exact name the server validates.

All app packages were regenerated from their manifests; no generated files were
hand-edited.
