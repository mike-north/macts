---
'@macts/core': minor
'@macts/api': patch
---

Ensure list output surfaces the identifier sibling operations require, under one canonical name

To call a write/get/delete route an agent first needs the target's identifier, and the
natural way to obtain it is to `list` the resource. But list output left two gaps: the
identifier could be missing (the executor read only declared `properties`, so an
identifier declared solely in a resource's `identifiers` was omitted), and the value was
exposed under an app-specific property name (e.g. `calendarIdentifier`) that differs from
what sibling operations reference (e.g. `calendarId`) — leaving the consumer no reliable
way to map one to the other. A live `calendars.list()` hit exactly this: it returned no
usable id for `events.create`.

**Single source of truth (`@macts/core`):** a new identifier module derives a resource's
primary identifier property from the manifest's `identifiers` array (primary-first) and
defines the canonical key (`id`) under which every surface exposes it. The server's list
executor now (1) always reads the manifest-declared primary identifier — even when it is
not also a regular property — and (2) mirrors that value onto the canonical `id` key, so
a consumer can always read `item.id` regardless of the app's property name. The generated
SDK read type surfaces an optional `id` field (and its Zod schema) for resources whose
identifier is not already named `id`.

Resources that declare no identifier are handled gracefully: list still returns their
declared properties and simply omits the canonical alias rather than inventing one.

All app packages were regenerated from their manifests; no generated files were
hand-edited.
