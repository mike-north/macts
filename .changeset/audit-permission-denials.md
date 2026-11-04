---
'@macts/core': minor
'@macts/runtime': minor
---

Audit permission denials as `permission-denied` records.

A call whose key lacks the operation's permission now writes one `permission-denied` audit record, for `invoke` and `resolveReference` alike, wherever the governance context has an audit writer (the host governance always has one, its audit log). With no audit writer, nothing is written. It is written after admission, so where the runtime has a rate limiter (as the HTTP server does by default) that limit also bounds how many are written, and before input validation, so it carries only the operation's permission, the app, the key and the time: the record is the same whatever the call's input. A call turned away earlier (an unverified credential, a rate-limited call, an unknown operation or app) still writes nothing. The caller's answer is unchanged: the same `PermissionDeniedError`, with the same message, code and details. If the record cannot be written, the caller is still answered `PermissionDeniedError` and the failure is logged to the operator log with the operation, the key and the correlation id.

In `@macts/core`, `AUDIT_DECISIONS` and `AuditDecision` gain `'permission-denied'`, so an exhaustive `switch` over decisions needs a new case. `AuditRecord`, `AuditRecordInput` and `SerializedAuditRecord` gain the `PermissionDeniedAuditRecord` kind, which has no `argsSummary`, `reason`, `approvalId` or `issueCount`; the constructor, serializer and file writer refuse one that carries any of them. `GovernedAuditDecision` excludes it: narrow to a governed decision (one that is neither `'invalid-input'` nor `'permission-denied'`) before reading `argsSummary`. A custom `AuditWriter` receives these records. Audit volume grows by one record per denied call. `recordPermissionDenied()` writes the new record.
