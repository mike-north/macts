---
'@macts/core': minor
---

A manifest whose hierarchy names a resource it does not declare is now rejected. Every hierarchy entry's `resource`, at any depth, must be a key of `resources`; the error names the entry's path and the value. Before, a misspelt key was accepted and placed nothing, so the checks that read the hierarchy for which resources the app holds only within a container silently skipped the resource it meant. Every shipped manifest already meets the rule.
