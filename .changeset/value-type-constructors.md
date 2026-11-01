---
'@macts/contracts': minor
---

Add `ValueTypes`, the shared constructors for value contracts

Each constructor composes one value's SDK schema, wire schema, native plan, and codecs from a single call. The constructors are `string`, `boolean`, `integer`, `double`, `date`, `point`, `rectangle`, `rgb`, `enumeration`, `array`, `record` (with `optional` fields), `nullable`, `unknown`, and `none`. Because the three representations come from one composition, they cannot disagree. Record types infer their SDK shape, and `optional` and `nullable` stay independent axes.

`encode` validates runtime values that bypass static types, such as a cast fractional `Integer`, and reports every issue with its path and code. `decode` restores native SDK values: branded integers, `NaN`, the infinities, and `-0`, `Date`s honoring any offset, and absent optional fields with no own property. An enum member the SDK does not know is rejected with the field path, the received value, and the known members. Dynamic content stays self-describing, so a user record can never be read as a control record.
