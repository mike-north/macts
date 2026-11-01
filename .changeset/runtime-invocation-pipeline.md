---
'@macts/runtime': minor
'@macts/api': minor
---

Add the shared invocation pipeline to `@macts/runtime`

**`createRuntime({ executor })`** builds a runtime that runs every operation through one ordered pipeline: verify the caller's credential, check the operation's permission, enforce governance policy (auditing the decision and, for a held call, asking a human and recording the answer), validate the input, and only then hand the request to the executor. No step can be skipped, and failures are the structured errors from `@macts/contracts` (`AuthenticationError`, `PermissionDeniedError`, `PolicyDeniedError`, `ApprovalPendingError`, `ApprovalRejectedError`, `ValidationError`, `OperationCancelledError`, `InternalError`). Anything unexpected, such as an unreadable key policy or an audit record that cannot be written, denies the call. An executor failure that is not a structured error becomes an `InternalError` whose message does not repeat the underlying failure.

- `runtime.registerManifest(manifest)` registers every operation a manifest exposes, with the same ids and permissions as the RPC routes. `runtime.registerContract(contract, manifest)` registers a generated contract's operations and refuses any whose permission or target disagrees with the manifest, so a stale or altered package cannot widen what a key authorizes. Registering the same operation id twice is refused.
- `createBearerCredential(token)` wraps an API key so it never appears in logs, errors, `JSON.stringify`, or `util.inspect`. Only `reveal()` returns it.
- `createKeyStoreVerifier()` verifies macts API keys against the local key store and reports failures as `missing`, `malformed`, `invalid`, `expired`, or `revoked`.
- The executor is supplied at construction, so any implementation of `Executor` from `@macts/core` can be wired in.

`buildCommandSchema` and `buildSchemaRegistry` now live in `@macts/runtime`. `@macts/api/server` still re-exports them, and `@macts/api` no longer depends on `zod` directly.
