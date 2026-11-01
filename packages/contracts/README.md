# @macts/contracts

Platform-neutral contracts shared by macts clients, runtimes, adapters, and
generated app packages.

This package defines:

- what an operation is
- which values cross an operation's boundary, and in what wire form
- how references and files hydrate
- what authority an invocation carries
- which structured errors an invocation can fail with

It depends on nothing Mac-specific, so a remote client on any platform can load
it. It is also the single place where each structured error class is declared,
which is what makes `instanceof` behave the same for local and remote clients.

Generated app packages import these contracts from here directly. The intended
path for application code is a re-export through `@macts/sdk`; see decision D1
in the design document linked below.

## What's here

| Area       | Highlights                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Values     | `Integer` brand and `INTEGER_LIMITS`, `Point`, `Rectangle`, `Rgb`, wire control records, `ValuePlan`, `ValueType` |
| References | `ObjectReference`, `CollectionReference`, identity and selector forms, `ReferenceList`                            |
| Files      | `FileValue`, `TemporaryFileCopy`, `SignedDownload`, `CallerOwnedFile`, `UploadedFile`, `UploadTarget`             |
| Invocation | `Credential`, `InvocationContext`, `Authority`                                                                    |
| Errors     | `MactsError` and its subclasses, `ErrorDetailsByCode`, `ERROR_CLASSES`, `WireError`                               |
| Operations | `OperationDescriptor`, `AppContract`, `ClientRuntime`, `ClientFactory`                                            |
| Exhaustion | `UnreachableError`, whose constructor accepts only `never`                                                        |

The design behind these contracts is in
[`phases/13-sdk-value-and-execution-contracts.md`](../../phases/13-sdk-value-and-execution-contracts.md).
