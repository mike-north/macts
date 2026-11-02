---
'@macts/core': minor
'@macts/automator': minor
'@macts/notes': minor
'@macts/preview': minor
'@macts/script-editor': minor
'@macts/system-information': minor
'@macts/terminal': minor
'@macts/textedit': minor
'@macts/xcode': minor
---

A resource keyed by `name` is now looked up the way its app can find it. Before, such a resource was addressed with the by-id lookup, so asking for one by its name found nothing in an app whose class has no `id`.

**Breaking, Notes and Terminal:** where the app's class has a real `id`, that `id` is now the identifier.

- Notes accounts, folders and notes: `get` takes `id` instead of `name` (`accounts.get(id)`, `folders.get(id)`, `notes.get(id)`), and the request field and tool input are `id`. The CLI's positional argument is likewise the item's `id`. Pass the `id` of a listed item. The record's `id` is now never null. A note's `name` stays non-null, on probe evidence that every note read has one; an account's or folder's `name` is now nullable, because only the identifier is promised to be present.
- Terminal windows and settings sets: `get` takes the integer `id` instead of `name` (`windows.get(id)`, `settingsSets.get(id)`). The record's `id` is now a never-null integer, and `name` is nullable. Tabs keep their own `get`, unchanged.

Notes `notes.create` now lists `name` among the required fields of its tool input schema, as every other app's create does for a writable property that is not its identifier. The typed SDK input is unchanged: `name` stays optional.

Where the app's dictionary shows no `id`, the resource keeps `name` and is matched on it, with the dictionary fact cited in its manifest: TextEdit, Preview, Script Editor and System Information documents; Xcode file, text and source documents, build settings, resolved build settings and run destinations; Automator settings and required resources. No signature changes for these; their `get` now finds the item by name.

`@macts/core` adds a guard over every shipped manifest: a usable resource whose primary identifier is `name` must declare `targeting: byProperty`. The only exceptions are named, with a reason: the Alfred and Bluetooth File Exchange application singletons, which no operation addresses, and Microsoft Word documents and OmniGraffle layers, whose dictionaries are not available to read.
