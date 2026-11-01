---
'@macts/core': minor
---

Add the in-process native value codec, `NATIVE_CODEC`

`NATIVE_CODEC.prelude` converts wire values to native values for operation arguments, and native results to wire values, inside the automation process and before results are serialized. Integers become canonical decimal text within the safe-integer range. Doubles keep their classification, including `NaN`, the infinities, and `-0`. Dates carry exact milliseconds. Points, rectangles, and 16-bit RGB colors wrap each numeric member. Closed enums reject unknown members with an actionable message. Records follow the presence rules: a missing value is `null` only where the field is nullable, and is omitted at an optional field. Numbers in dynamic content are always doubles, and user records there are enveloped so they cannot be mistaken for control records. A value that violates its plan fails with a structured codec error that carries the direction and the path. Reference and file values have no conversion in this codec and fail with a codec error that says so. Absence is never turned into `null`: `undefined` is accepted only at an optional record field, where it is omitted.
