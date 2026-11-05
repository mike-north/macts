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

## Client composition

`@macts/contracts/client` exposes the platform-neutral `createRemoteClient`,
`createCodecClient`, and `bindReference` composition used by `@macts/sdk`.
A transport supplies wire operation and reference results; the shared codec
validates SDK inputs, decodes outputs, and binds references to the creating
client's authority. The contracts root remains independent of client composition.
Neither this subpath nor its dependency closure loads the Mac-side runtime.
Use the SDK's existing factories for ordinary applications; generated facades
can reuse this seam without depending on the SDK, core, or runtime.

The client entry publishes declarations with imports from the canonical contracts
root. Its API report is checked separately, but its declarations are not rolled
up a second time: copying the root's unique-symbol brands would create incompatible
Integer, reference, and client types between the two entry points.
