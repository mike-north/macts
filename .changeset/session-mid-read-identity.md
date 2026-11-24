---
'@macts/core': patch
---

A Session read by identity that leaves its Tab and returns while it is being read now fails as a missing target or a retryable `CollectionChangedError`, instead of returning a record with fields missing that surfaced as `UnexpectedValueError`. When a property read reports the object missing, the read confirms that the object still exists with the sought identity before treating the property as omitted or empty. This applies to the Tab-scoped get, the Window-scoped resolve and reads of a decoded Session reference; format 1.0 reads are unchanged.
