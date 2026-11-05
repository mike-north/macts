---
'@macts/contracts': patch
'@macts/core': patch
---

An index selector reference must now carry a container chain of identity references only, each the parent its resource is found within, ending at one the app finds at the application. A container above that, or a selector anywhere in the chain, is rejected.

A positional resource must now sit under a parent the app finds at the application by its identifier, and every command that selects one of its items must record that parent, as its get does, and declare its integer item parameter. No command may record a positional resource as its parent. A manifest that does otherwise is refused by the manifest schema, by generation and by registration.

The native codec now converts a reference's container only as an identity reference: an input reference whose container chain holds a selector fails as `InternalError` before the app is touched. In `@macts/core`, `NativeCodecEnvironment.positionOf` now takes the collection the position is counted in, and reads a position only from a specifier that ends at that collection of a container below the application.
