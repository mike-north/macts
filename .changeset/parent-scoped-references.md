---
'@macts/contracts': minor
'@macts/core': minor
'@macts/runtime': minor
'@macts/sdk': minor
'@macts/automator': minor
'@macts/calendar': minor
'@macts/contacts': minor
'@macts/microsoft-edge': minor
'@macts/music': minor
'@macts/omnigraffle': minor
'@macts/reminders': minor
'@macts/xcode': minor
---

Some reference inputs now require a container. When the operation that resolves a reference finds objects only within an object of another resource, the reference has to name that parent as its container.

- Music gets and lists tracks within a playlist.
- Contacts gets and lists addresses, emails and phones within a person.
- Calendar gets and lists events within a calendar.
- Some apps list resources only within a parent, though each gets a single one without a parent:
  - Reminders lists reminders within a list.
  - Microsoft Edge lists tabs within a window, and bookmark items within a bookmark folder.
  - OmniGraffle lists graphics, shapes, lines and layers within a canvas.
  - Xcode lists projects, schemes and run destinations within a workspace document.
  - Automator lists actions and variables within a workflow, and an action's settings and required resources within that action.

The generated resource table records this for each resolving operation, as `parents: { get?, list? }` on the resource. `ResourceDescriptor.parents` (of type `ResourceParents`) in `@macts/contracts` describes it. A reference takes the parent of the operation that resolves it:

- A single-object reference, a container and an identity-collection entry take the `get` parent.
- A selector collection (every or range) takes the `list` parent.

Where a parent applies, the reference's `container` must be an identity reference to it. The following reject a reference with no container, with a container naming another resource, or with a selector container:

- encoding and decoding;
- `bindReference`;
- the runtime's reference check;
- the published input JSON Schemas.

Encoding and `bindReference` raise a `ValidationError` at `container` that names the parent. The reference data types reject the same references at compile time. A chain of parents is checked level by level. A container whose parent is name-keyed and not claimed unique (Calendar calendars, Automator workflows, Xcode workspace documents) names the parent by name, so a name others share resolves to the first match the app returns. References resolved through an operation that works at the application are unchanged.

Behavior change: code that built such a reference without its container now fails to compile and is rejected at runtime. That covers references to a track, address, email, phone or event, and collections of reminders, tabs, graphics and the other listed resources. Add the parent's identity reference as `container`. Contacts' input JSON Schemas grow, because each container branch for an address, email or phone now spells out the person container it requires.

The macOS provider still does not convert a reference with a container. Passing one to an operation still fails with `InternalError`, and operations still return no references to these resources.
