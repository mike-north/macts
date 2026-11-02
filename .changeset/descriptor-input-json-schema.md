---
'@macts/contracts': minor
---

`OperationDescriptor` gains an optional `inputJsonSchema`: the draft-7 JSON Schema of the input's wire values, exactly `z.toJSONSchema(input.wire, { target: 'draft-7' })`. Generated descriptors always carry it, for consumers that read an operation's input schema as plain data without zod. Adapters never read or serve it; they derive their schemas from `input.wire`.
