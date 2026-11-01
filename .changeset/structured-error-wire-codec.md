---
'@macts/contracts': minor
---

Add the structured error wire codec. `toWireError` / `toWireErrorEnvelope` encode a structured error as `{ error: { code, message, details } }`, passing details through their per-code schema so only declared fields are sent. `fromWireErrorEnvelope` reconstructs the same canonical class from the code (never from the HTTP status); an unknown code or malformed body becomes a `TransportError` with reason `protocol-mismatch`. Per-code details schemas are exported as `WIRE_ERROR_DETAILS_SCHEMAS`.
