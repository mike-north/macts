---
'@macts/contacts': patch
---

An address id from another person now gives `TargetNotFoundError` naming `Address` from `addresses.get` and from reference resolution, instead of a record.

Contacts finds an address within its person by matching the address's `id`, rather than by the app's id lookup, which under a person who holds no address reports an address that person does not hold. Email addresses and phone numbers are found as before. The address id stays claimed unique, so `addresses.list` pages as before.
