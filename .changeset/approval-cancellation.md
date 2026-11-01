---
'@macts/core': minor
'@macts/runtime': minor
---

A caller can abandon a call that is held for human approval. `seekApprovalUnlessCancelled()` in `@macts/core` waits for a decision like `seekApproval()`, but ends at once when the caller's signal aborts, aborting the provider's signal so it can retract its prompt. It returns an `ApprovalCancellation` instead of a decision, and `recordApprovalCancellation()` resolves the held call's audit trail with the new `'cancelled'` decision. The runtime uses both: an abort during a hold now fails with `OperationCancelledError` right away, records `'cancelled'` rather than an approval, and never executes the call.

The runtime also exports `operationsFromContract()`, which checks a generated contract against its manifest without constructing a runtime. Operator logs record an unexpected failure as its name, code, message, and stack, with the caller's credential scrubbed, rather than as the raw error object.
