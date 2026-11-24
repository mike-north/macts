---
'@macts/core': patch
---

A Session read by identity never returns another Session's data. When a property read reports the object missing, the read now confirms that the object still exists with the sought identity before treating the property as omitted or empty, so a Session that is gone, moved or replaced at that point fails as a missing target or a retryable `CollectionChangedError` instead of returning a record with fields missing. A Session that leaves and returns within a single property read can still produce an incomplete record of its own data, which the output check reports as `UnexpectedValueError`. This applies to the Tab-scoped get, the Window-scoped resolve and reads of a decoded Session reference; format 1.0 reads are unchanged.
