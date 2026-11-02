---
'@macts/runtime': minor
---

`MactsRuntime.invoke` now validates every operation result against the operation's output contract before returning it, as `resolveReference` already did, whichever executor produced it. A result that does not match fails with `UnexpectedValueError` (`UNEXPECTED_VALUE`, HTTP 502) instead of reaching the caller. Previously `invoke` returned whatever the executor produced, so a custom executor's malformed result reached HTTP and MCP callers unchecked.

The operation has already run when its result is checked, so it may have changed the app. The error message says so: "The "<operation>" operation ran in the app, but its result does not match its contract; do not assume it had no effect." Do not retry a create or a send on the assumption that nothing happened. The error's issues give a path into the result, a code, and a message built from the contract's expectations (for example `Expected one of "mint" | "worn".`); they never repeat a value from the result, which may be user content. Undeclared keys are counted, not named. `resolveReference` reports a mismatch the same way, with "to resolve a reference" after "ran in the app".

An operation whose output plan is `passthrough`, such as every operation registered with `registerManifest`, has no wire encoding and is not checked, on `invoke` or on `resolveReference`. `resolveReference` previously checked such results; it no longer does. Its check that an identity collection's result holds one record per entry still applies to every plan.
