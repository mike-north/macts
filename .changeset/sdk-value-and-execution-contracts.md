---
'@macts/contracts': minor
'@macts/core': minor
---

Add the shared contracts for local and remote SDK clients

**`@macts/contracts`** is a new platform-neutral package. It holds the contracts that both clients, the runtime, the adapters, and generated app packages share:

- **Values** — the `Integer` brand and its safe-integer domain (`INTEGER_LIMITS`), `Point`, `Rectangle`, 16-bit `Rgb`, and the wire control records. Integers travel as decimal text (`{"integer":"42"}`); doubles, including `NaN`, the infinities, and `-0`, travel as `{"double":…}`. The package also defines the serializable `ValuePlan` (including `PASSTHROUGH_PLAN` for values that carry no wire encoding), the `WireRecord` input shape, and the `ValueType` contract that ties an SDK schema, a wire schema, and a native plan together.
- **References** — identity versus selector and single versus collection as independent axes, plus materialized `ReferenceList`s, each with precise `resolve()` result types.
- **Files** — `FileValue` and the transfer handles, which are distinct per locality: `TemporaryFileCopy`, `SignedDownload`, `CallerOwnedFile`, `UploadedFile`, and `UploadTarget`.
- **Invocation** — `Credential`, `InvocationContext`, and the token-derived `Authority`.
- **Errors** — the canonical structured error classes (`ValidationError`, `TargetNotFoundError`, `PermissionDeniedError`, `PolicyDeniedError`, and the rest), their typed `details`, the `WireError` envelope, and the `ERROR_CLASSES` registry used to reconstruct the same class from the wire.
- **Operations** — `OperationDescriptor`, `AppContract`, `ClientRuntime`, `ClientFactory`, and the `CallOptions` that invocation, reference resolution, and file fetching share.
- **Exhaustiveness** — `UnreachableError`, whose constructor accepts only `never`, so an unhandled member of a closed union becomes a compile error.

**`@macts/core`** adds two interfaces:

- **The executor seam** — `Executor` and `ExecutionRequest`, the provider-neutral interface through which an authorized, validated operation is handed to a provider.
- **The in-process native codec contract** — `NativeCodec`, `NativeScript`, `NativeFailure`, and `NativeOutcome`, plus the `NATIVE_*` names. It defines how wire values are converted to and from native values inside the automation process, before results are serialized.

These are interfaces and error classes only; no existing behavior changes.
