---
'@macts/tv': minor
---

TV can now list and get its sources, the playlists of a source, and its browser and playlist windows:

- `tv.sources.list` and `tv.sources.get`: a source is found by its persistent ID.
- `tv.playlists.list` and `tv.playlists.get`: these read a playlist under its source, and take the source's persistent ID as `sourceId`. A playlist is found by its persistent ID. The app keeps playlists within sources, and a source can hold a playlist that the app's own playlist list leaves out, so playlists are always read under their source.
- `tv.browserWindows.list`, `tv.browserWindows.get`, `tv.playlistWindows.list` and `tv.playlistWindows.get`: a window is found by its id.

Sources and playlists now carry their `persistentID`. The playlist commands in the CLI now label their argument as the playlist's persistent ID.

A window's view and a playlist's parent stay out of output for now, because a playlist is read only under its source.
