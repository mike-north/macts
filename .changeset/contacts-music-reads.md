---
'@macts/contacts': minor
'@macts/music': minor
'@macts/core': minor
---

Contacts and Music can now be read. Before, neither app had a list or get operation on any surface, so an agent could not list people or read a playlist.

Contacts:

- `people.list` and `people.get`, and `groups.list` and `groups.get`, by each record's `id`, which the app keeps with the record.
- `emails`, `phones` and `addresses` of one person: `list(personId)` and `get(personId, id)`.
- People and groups now include their `id`, `creationDate` and `modificationDate`. A person's `birthDate` is now a date, as the app reports it, instead of a string.

Music:

- `playlists.list` and `playlists.get(persistentID)`.
- `tracks.list(playlistId)` and `tracks.get(playlistId, persistentID)`, under a playlist. The library playlist holds every track in the library, so a track listed under any playlist can also be read under the library playlist.
- Playlists and tracks are looked up by their persistent ID, which is the same in every playlist that holds a track. Their numeric `id`, also included, identifies a track's entry in one playlist. Tracks now include their `name`, `id`, `index` and `persistentID`; playlists, their `id`, `index` and `persistentID`.
- A playlist's `parent` is left out: for a playlist that is in no folder, the app fails the read instead of reporting no value.

Behavior change: a get, update or delete of an item under a parent now looks the item up the way its resource is identified, as top-level lookups already did, instead of always by `id`. In the shipped manifests only Music's `tracks.get` is affected.

Behavior change: when a list result carries identifier aliases (operations served without a typed contract), its canonical `id` no longer overwrites a resource's own `id` field. This affects Notes accounts, folders and notes and Terminal windows and settings sets, whose list records carried their name as `id`. They now keep their real `id`, as their read types already declared. `resolveCanonicalIdentifierSource` names the field a resource's alias mirrors, if any.
