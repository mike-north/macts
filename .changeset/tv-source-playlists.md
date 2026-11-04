---
'@macts/tv': minor
---

TV can now list and get its sources, the playlists of a source, and its browser and playlist windows:

- `tv.sources.list` and `tv.sources.get`: a source is found by its persistent ID.
- `tv.playlists.list` and `tv.playlists.get`: these read a playlist under its source, and take the source's persistent ID as `sourceId`. A playlist is found by its persistent ID. The app keeps playlists within sources, and a source can hold a playlist that the app's own playlist list leaves out, so playlists are always read under their source.
- `tv.browserWindows.list`, `tv.browserWindows.get`, `tv.playlistWindows.list` and `tv.playlistWindows.get`: a window is found by its id.

A reference to a playlist now requires its source as its container, an identity reference to the source, because both the playlist get and the playlist list read a playlist only within its source. The resource table records this as `parents: { get: 'Source', list: 'Source' }` on `Playlist`. A playlist reference without the container, or with a source picked by position, raises a `ValidationError` at `container` that names the source, and the reference types reject it at compile time.

Sources and playlists now carry their `persistentID`. The playlist commands in the CLI now label their argument as the playlist's persistent ID.

A window's view and a playlist's parent stay out of output for now, because a playlist is read only under its source.
