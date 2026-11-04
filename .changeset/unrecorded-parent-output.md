---
'@macts/core': minor
---

Code generation leaves out an output field when its reference is to a resource the manifest's hierarchy holds only within another resource, never at the application, while that resource's get names no container. Such a reference could not be resolved, because the get would look in a list the app does not have. Generation warns about each one, saying that the app holds the resource only within a container and that macts's get for it does not name that container yet. If the hierarchy does not place the resource anywhere, this rule does not apply. No shipped manifest has such a field after this change.
