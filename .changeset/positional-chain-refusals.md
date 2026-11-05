---
'@macts/contracts': patch
'@macts/core': patch
---

An index selector reference must now carry a container chain of identity references only, each the parent its resource is found within, ending at one the app finds at the application. A container above that, or a selector anywhere in the chain, is rejected.

A positional resource must now sit under a parent the app finds at the application by its identifier, and every command that selects one of its items must record that parent, as its get does, and declare its integer item parameter. No command with an executable route may record a positional resource as its parent. A manifest that does otherwise is refused by the manifest schema, by generation and by registration.

For every positional CRUD route, usable hierarchy placement constrains where the command can address its collection. A nested-only collection requires a recorded parent, and any recorded parent must be a declared holder. Application-wide list/create and resources with no usable placement retain their existing scope behavior. Every recorded parent must be an ordinary identified collection resource with a usable unparented get, must not be known nested-only, and must have its required identity parameter supplied. A top-level collection does not waive an explicitly recorded ancestor requirement. Unsupported commands and resource targets contribute no executable route.

The native codec now converts a reference's container only as an identity reference: an input reference whose container chain holds a selector fails as `InternalError` before the app is touched. In `@macts/core`, `NativeCodecEnvironment.positionOf` now takes the collection the position is counted in, and reads a position only from a specifier that ends at that collection of a container below the application.
