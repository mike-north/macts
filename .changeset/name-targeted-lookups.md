---
'@macts/alfred': patch
'@macts/automator': patch
'@macts/bluetooth-file-exchange': patch
'@macts/microsoft-word': patch
'@macts/notes': patch
'@macts/omnigraffle': patch
'@macts/preview': patch
'@macts/script-editor': patch
'@macts/system-information': patch
'@macts/terminal': patch
'@macts/textedit': patch
'@macts/xcode': patch
---

Items these apps have no dictionary id for are now looked up by the property that identifies them, instead of by an id that cannot find them.

A get of a TextEdit, Preview, Script Editor, System Information or Microsoft Word document, or of an OmniGraffle layer, looked the item up with the app's id specifier, using its name as the id. These classes have no id, so that lookup found nothing. A get now finds the item whose name matches. The same applies to Notes accounts, folders and notes, which have an id but are got by name, and to Terminal windows and settings sets, got by name, and tabs, got by their tty.

Names are not claimed unique. When two items share the name you ask for, a get returns the first of them in the app's own order. It does not fail as ambiguous.

Each manifest now declares this targeting on the identifiers it already had, with the dictionary evidence for it. This also covers resources that have no operations yet: Alfred's and Bluetooth File Exchange's application, Word paragraphs, and Xcode file, text and source documents, build settings, devices and build issues. No identifier, parameter or operation changes.

Update these packages together with `@macts/runtime`. A runtime from this release refuses an earlier release of any of these packages as a whole, because its manifest leaves those identifiers without targeting.
