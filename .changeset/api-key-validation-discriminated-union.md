---
'@macts/core': minor
'@macts/api': minor
'@macts/cli': patch
---

Convert `ApiKeyValidationResult` to a discriminated union on `valid`

`ApiKeyValidationResult` was a single interface with `valid: boolean` and
optional `payload`, `error`, and `errorCode` fields, forcing consumers to add
defensive guards (e.g. `result.valid && result.payload`) that the type system
could not verify. It is now a discriminated union of `ApiKeyValidationSuccess`
(`valid: true`, required `payload`) and `ApiKeyValidationFailure`
(`valid: false`, required `error` and `errorCode`), so narrowing on
`result.valid` gives direct, type-safe access to the appropriate fields.

The failure error codes are extracted into a new exported
`ApiKeyValidationErrorCode` type, which the API server's `AuthErrorCode` now
builds on instead of duplicating the code list. Consumers (API auth middleware,
CLI `api-key verify`) drop their defensive `payload` guards and error-message
fallbacks in favor of narrowing.

Breaking for TypeScript consumers that constructed partial results (e.g.
`{ valid: false }` without `error`/`errorCode`); runtime behavior is unchanged
except that a failure response message can no longer silently fall back to a
generic string.
