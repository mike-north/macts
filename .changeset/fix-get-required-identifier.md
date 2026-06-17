---
'@macts/core': patch
---

Fix get/update/delete inputSchema spuriously requiring identifier property alongside declared id param

When a resource command (get, update, delete) declares its own required parameter (e.g. `id`), the
resource's primary identifier property (e.g. `name` for Calendar, `uid` for Event) was incorrectly
being added to the `required` array in addition to the declared param. The identifier property is
now only added to `required` when the command declares no required params of its own (the fallback
for resources without an explicit id parameter).

This corrects `required: ['id', 'name']` → `required: ['id']` in `calendars.get` and similar
operations across all app packages. Regenerated capabilities and MCP tool artifacts are included.
