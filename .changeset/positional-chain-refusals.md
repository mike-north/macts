---
'@macts/contracts': patch
'@macts/core': patch
---

An index selector reference must now carry a container chain of identity references only, each the parent its resource is found within, ending at one the app finds at the application. A container above that, or a selector anywhere in the chain, is rejected.

A positional resource must now sit under a parent the app finds at the application by its identifier, and every command that selects one of its items must record that parent, as its get does. A manifest that does otherwise is refused by the manifest schema, by generation and by registration.
