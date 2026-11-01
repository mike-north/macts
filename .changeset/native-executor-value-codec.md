---
'@macts/core': minor
---

Native operations now convert values through their contract inside the automation process. The native executor runs every operation with the in-process value codec, so integers, special doubles, negative zero, and dates survive the trip to and from the app. A result that violates the contract fails with `UnexpectedValueError`, and input that cannot be converted fails with `ValidationError`, each with the offending `issues`. A script that does not compile, or whose outcome cannot be read, fails with `InternalError`. `runNativeScript()` runs one native script with a codec, honoring the time limit, the abort signal, and the output limit, and resolves to the outcome the automation process reported. The executor's `NativeTransport` now runs a native script and resolves to that outcome.

List results keep the legacy `id` alias, and the declared identifier mirrored from a working property, only when the operation's output passes through unconverted. A typed result contract receives exactly the record's declared fields. `buildNativeBody()` takes `{ identifierAliases }` to choose between the two.
