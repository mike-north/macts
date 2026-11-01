---
'@macts/core': minor
'@macts/cli': minor
'@macts/calendar': minor
'@macts/calendar-server': minor
'@macts/finder': minor
'@macts/finder-server': minor
'@macts/notes': minor
'@macts/notes-server': minor
'@macts/reminders': minor
'@macts/reminders-server': minor
---

Generated SDKs no longer expose properties that the app cannot provide at runtime.

- A manifest property can now carry an evidence-backed `unsupported` marker. Every generated surface (contract, SDK, CLI, MCP tools, HTTP routes) omits a marked property.
- `macts probe --nullability` reports a defect when every read of a property fails. It also reports a defect when the observed value kind (date, number, boolean, string, record, list, reference) contradicts the declared type, and suggests the marker where it fits.
- Nested resources are now sampled from evenly spaced parents within a bounded scan, so deep collections such as calendar event alarms yield items instead of hitting the time limit. The probe record gains `parentsScanned`.
- **Breaking SDK field changes:**
  - Finder: `Container.expandable`, `expanded`, `completelyExpanded`, `containerWindow` removed. `ApplicationFile.suggestedSize`, `minimumSize`, `preferredSize`, `opensInClassic` removed. `DocumentFile.id` removed. `Package.id` is now a string.
  - Calendar: `Calendar.calendarIdentifier` removed. Calendars are targeted by name. `Event.stampDate` is now nullable, because a wider sample found events without it.
  - Notes: `Folder.container` removed.
  - Reminders: `allDayDueDate` is renamed `alldayDueDate` and is nullable. `List.color` is now a string.
