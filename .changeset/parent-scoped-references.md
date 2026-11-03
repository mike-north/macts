---
'@macts/contracts': minor
'@macts/core': minor
'@macts/runtime': minor
'@macts/sdk': minor
'@macts/calendar': minor
'@macts/contacts': minor
'@macts/music': minor
---

A reference to a resource the app finds only within another resource now has to name that parent. Music tracks are found within a playlist; Contacts addresses, emails and phones within a person; Calendar events within a calendar. The generated resource table records this as `parent: '<ParentKey>'` on the resource, and `ResourceDescriptor.parent` in `@macts/contracts` describes it.

Wherever such a reference is resolved, its `container` must be an identity reference to the parent: as a position's own reference in either form, as a container, as an identity-collection entry, and as a selector collection. Encoding, decoding, `bindReference`, the runtime's reference check and the published input JSON Schemas reject a reference with no container, a container naming another resource, or a selector container, each with a `ValidationError` at `container` that names the parent. The reference data types reject the same references at compile time. A chain of parents is checked level by level. References to resources found at the application are unchanged.

Behavior change: code that built a reference to a track, address, email, phone or event without its parent container now fails to compile and is rejected at runtime. Add the parent's identity reference as `container`. Contacts' input JSON Schemas grow, because each container branch for an address, email or phone now spells out the person container it requires.

The macOS provider still does not convert a reference with a container, so passing one to an operation still fails with `InternalError`, and operations still return no references to these resources.
