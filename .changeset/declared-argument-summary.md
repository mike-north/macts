---
'@macts/core': minor
'@macts/runtime': minor
---

Summarize only declared arguments in audit and approval records, validate input before governance, and record calls rejected by input validation as `invalid-input` audit entries without their arguments.

The runtime now checks a call's permission, then validates its input, and only then applies governance and approval. Audit and approval records summarize the operation's declared parameters from the validated input; any other keys are recorded only as a count, `unknownKeys: N`. A call whose input fails validation after the permission check writes one `invalid-input` audit record with its issue count, is not evaluated by policy, and is never put to an approver.

In `@macts/core`, `AuditRecord`, `AuditRecordInput` and `SerializedAuditRecord` are now unions discriminated by `decision`: `GovernedAuditRecord` carries `argsSummary` as before, and `InvalidInputAuditRecord` carries `issueCount` and never a summary, reason or approval id. Narrow on `decision !== 'invalid-input'` before reading `argsSummary`. `recordInvalidInput()` writes the new record.
