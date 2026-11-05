---
'@macts/core': minor
'@macts/contracts': minor
---

Generated app constructors now share the contract client's value codec, reference authority and HTTP transport. Typed methods return canonical Date, Integer, null and hydratable reference values, and throw canonical structured errors. Constructors, numeric argument conveniences, standalone resource clients and custom HttpClient.rpc overrides remain available.

Root record and input types reuse their app contract definitions. Numeric create/update conveniences retain runtime validation before dispatch. Raw HttpClient.rpc, app-specific error exports and raw response schema validators remain available for explicit passthrough consumers; typed methods target contract-registered services.

Raw and typed RPC now share protocol handling even through overrides forwarding only public arguments. Valid raw results, including null void results, and arbitrary server app-error codes/messages are preserved. Malformed JSON and missing success results now consistently throw TransportError for explicit raw calls as well as typed methods.
