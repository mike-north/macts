---
'@macts/contacts': minor
'@macts/contacts-server': minor
---

Contacts fields now carry observed nullability.

A read-only probe of Contacts 14.0 on macOS 27.2 recorded which fields the app leaves empty. The probe records presence only, never a value.

- Email and Phone fields that the app filled in every sampled item (at least 30 items) are now non-null in the generated types. For example, `Email.id`, `Email.label` and `Email.value` are `string`.
- Fields observed empty stay nullable, and their documentation states how often they were missing. For example, `Person.birthDate` was empty in all 23 sampled people.
