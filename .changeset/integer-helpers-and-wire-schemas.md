---
'@macts/contracts': minor
---

Add integer and RGB helpers and validators for wire values

- **`Integer.validate`, `Integer.round`, `Integer.truncate`, and `Integer.is`** sit on a value with the same name as the `Integer` type, so a type error that names `Integer` leads straight to the fix. Validation rejects fractions, non-finite values, and anything outside the safe-integer range, with a message that names the explicit conversion to use instead. Rounding is half away from zero, and nothing is ever clamped or rounded implicitly.
- **`Rgb.create`, `Rgb.from8Bit`, `Rgb.fromHex`, `Rgb.to8Bit`, and `Rgb.toHex`** build 16-bit colors and convert from and to 8-bit and hex forms. Each 8-bit channel is multiplied by exactly 257; converting back divides by 257 and rounds, which is documented as lossy.
- **`WireIntegerSchema`, `WireDoubleSchema`, `WireDateSchema`, and `DynamicWireValueSchema`** validate wire control records strictly. Integer text must be canonical and within the safe range. Doubles accept the `NaN`, infinity, and `-0` states but reject non-finite JSON numbers. Dates must be real calendar instants with three fractional digits and an explicit offset. Dynamic content must be self-describing.
- **`VALUE_ISSUE_CODES`** gives each value-contract violation a stable machine-readable code.
- The wire control-record types are now type aliases, so they are assignable to `WireValue`.
