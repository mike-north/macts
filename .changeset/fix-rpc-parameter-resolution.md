---
"@macts/api": patch
"@macts/calendar": minor
"@macts/calendar-server": minor
"@macts/core": patch
---

Fix RPC handler parameter resolution and update Calendar API parameter names

**Bug fix:**

RPC `get` and `delete` handlers now dynamically resolve parameter names from command definitions instead of hardcoding 'id'. This fixes an issue where resources with non-standard identifier names (such as `calendarIdentifier` or `uid`) would fail to resolve correctly.

**Breaking changes (Calendar packages):**

Calendar and Event resource methods now use semantic parameter names that match the underlying resource identifier properties:

- `Calendar.get()` parameter renamed: `id` → `calendarIdentifier`
- `Calendar.delete()` parameter renamed: `id` → `calendarIdentifier`
- `Event.get()` parameter renamed: `id` → `uid`
- `Event.delete()` parameter renamed: `id` → `uid`

**Migration guide:**

```typescript
// Before
await calendars.get(id)
await calendars.delete(id)
await events.get(id)
await events.delete(id)

// After
await calendars.get(calendarIdentifier)
await calendars.delete(calendarIdentifier)
await events.get(uid)
await events.delete(uid)
```

**Test improvements:**

Integration tests now include comprehensive coverage for edge cases and error conditions:

- Negative tests for invalid IDs, missing required fields, and malformed JSON
- Edge case tests for unicode names, long names, and invalid date formats
- Concurrency tests validating simultaneous resource creation
