---
'@macts/core': minor
'@macts/runtime': minor
---

Summarize only declared arguments in audit and approval records, validate input before governance, and record calls rejected by input validation as `invalid-input` audit entries without their arguments.

The runtime checks a call's permission, then validates its input, and only then applies governance and approval. Validating a paged list's input includes checking any cursor against the operation and the call's other inputs, so a cursor that cannot continue the listing is rejected before governance; only an anchor that has moved is reported during execution, as `COLLECTION_CHANGED`. Audit and approval records summarize the operation's declared parameters from the validated input; any other keys are recorded only as a count, `unknownKeys: N`. A call whose input fails validation after the permission check writes one `invalid-input` audit record with its issue count, is not evaluated by policy, and is never put to an approver.

In `@macts/core`, `AuditRecord`, `AuditRecordInput` and `SerializedAuditRecord` are now unions discriminated by `decision`: `GovernedAuditRecord` carries `argsSummary` as before, and `InvalidInputAuditRecord` carries `issueCount` and never a summary, reason or approval id. Narrow on `decision !== 'invalid-input'` before reading `argsSummary`. `AUDIT_DECISIONS` and `AuditDecision` gain `'invalid-input'`, so an exhaustive `switch` over decisions needs a new case, and a custom `AuditWriter` now receives records that have no `argsSummary`. `recordInvalidInput()` writes the new record.
