---
'@macts/contracts': minor
---

Add reference and file value types

`ValueTypes.reference(registry, resource, cardinality)` builds the value type for a typed reference position. It accepts both identity and selector forms for its cardinality, and a list of single references is `ValueTypes.array(ValueTypes.reference(…, 'one'))`. Identifiers are encoded and decoded with each resource's own identifier type, which `ResourceDescriptor.id` now carries, so containers of other resources round-trip correctly. A resource without an identifier has no `id` and is referenced only by selector forms. Encoding reads only a reference's data fields and never resolves it. Class instances and accessors are accepted, but an undeclared data property, such as a typo or a field from the other form, is rejected. The same rule applies to file sources. Both directions check:

- the resource and cardinality
- identity-collection entries
- non-negative selector positions
- ranges with `start <= end`
- single-object containers

`ValueTypes.file()` and `ValueTypes.fileSource()` cover file results and file inputs. A decoded file value is bound through `DecodeContext.bindFile`, and its fetch grant is never exposed on the value. Encoding an uploaded file sends only its upload id. Decoding an upload handle is rejected, because the service resolves uploads. `FileWireSchema` and `FileSourceWireSchema` are exported for server-side validation.

**Breaking:**

- `DecodeContext.bindReference` and `bindFile` now receive decoded `ReferenceData` and `FileData` instead of wire forms.
- `DynamicWireValue` no longer includes references or files. References, files, and file sources are rejected inside dynamic content, because they appear only at typed positions.
