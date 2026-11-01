---
'@macts/core': minor
---

Generate a transport-neutral contract for each app

Each generated app package now exposes `@macts/<app>/contract`. It holds the app's contract (for example `notesContract`), the client interface, and the record, input, and enum types. The contract contains one descriptor per operation, with its identity, permission, and input and result value types. Resource-typed fields are references, files are file values on output and file sources on input, and resources without an identifier are referenced by selectors. The manifest is loaded lazily, and only by the Mac-side runtime.

Each `ManifestRoute` now carries the operation's `permission`, derived once from the manifest. Generated packages declare `engines.node >=22.13.0`. The existing package entry points are unchanged.
