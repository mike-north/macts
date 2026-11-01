---
'@macts/core': patch
---

Native operations on multi-word collections now reach the app. Bodies used to address a collection by its plural lowercased (`app["mediaitems"]`), which no app resolves. They now use the app's own spelling of the dictionary term: the first word lowercased whole, each later word capitalized (`mediaItems`, `urlTracks`). That covers the collection itself, the parent a nested resource is reached through, and a parent derived from a parameter name.
