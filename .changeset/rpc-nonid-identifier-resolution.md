---
"@macts/api": patch
---

Fix RPC get and delete handlers to resolve identifier param name from the manifest

The `get` branch in the RPC resource command executor hardcoded `id` in the generated
JXA lookup (`app.<resource>.byId(id)`), causing failures for resources whose identifier
parameter is declared with any other name (e.g. `name`, `widgetName`). Several apps in
the current manifests — Notes, Automator, TextEdit, Terminal, Preview, Script Editor,
Xcode, OmniGraffle — already use `name` as their `get` identifier.

The `delete` branch was missing entirely and fell through to the generic handler, which
called `app.delete(...)` instead of the correct `app.<resource>.byId(<identifier>).delete()`.

Both branches now resolve the identifier variable name from the first required parameter
declared in the manifest command definition.
