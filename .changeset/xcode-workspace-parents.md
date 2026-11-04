---
'@macts/xcode': minor
---

Xcode projects, schemes and run destinations are now read within their workspace document. Xcode's scripting dictionary holds each of them only inside a workspace document, and the application has no list of every project, scheme or run destination. Before, `projects.get`, `schemes.get` and `runDestinations.get` looked for the object in a list Xcode does not have. A run destination is now found by its name within the workspace.

**Breaking change in Xcode:** `projects.get`, `schemes.get` and `runDestinations.get` now take the workspace document's name first: `schemes.get(workspaceName, id)`, `projects.get(workspaceName, id)` and `runDestinations.get(workspaceName, name)`. The CLI's `workspaceDocuments projects get`, `workspaceDocuments schemes get` and `workspaceDocuments runDestinations get` take `--workspace-name`. A workspace that is not open fails with a not-found error that names the workspace document. `WorkspaceDocument.activeScheme` and `Target.project` are removed from output types, so code that reads them no longer compiles, and `WorkspaceDocument.activeRunDestination` stays out of them. Each holds a reference to an object found only within a workspace document, and macts cannot yet return a reference together with its container. They are planned to come back once references carry their container.
