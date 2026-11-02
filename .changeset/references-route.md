---
'@macts/api': minor
'@macts/runtime': minor
---

The HTTP server resolves references remotely at `POST /references/v1/resolve`, a top-level namespace beside `/api/v1`. The body is exactly `{ "app", "reference" }`, where `reference` is the reference control record as encoding produces it; any other field is refused with `VALIDATION_FAILED` rather than ignored. The route runs `MactsRuntime.resolveReference` with the request's bearer credential, abort signal, and correlation id, so a resolution is authorized, governed, and audited as the resource's `get` or `list` operation. It answers `200 { result }` or the structured error envelope with the same statuses as the operation routes, and shares their per-client-address limit. `createReferencesAdapter` serves the route for a runtime you compose yourself.

Every 401 from the HTTP server now carries `WWW-Authenticate: Bearer`.

Apps named `references`, `transfers`, or `introspect` are refused: `registerManifest` and `registerContract` throw `OperationRegistrationError` and register nothing. The reserved names are exported as `RESERVED_APP_ROUTE_SEGMENTS` from `@macts/runtime`.
