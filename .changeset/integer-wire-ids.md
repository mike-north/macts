---
'@macts/core': patch
'@macts/automator': patch
'@macts/microsoft-word': patch
'@macts/omniplan': patch
'@macts/quicktime-player': patch
'@macts/system-events': patch
'@macts/tv': patch
'@macts/xcode': patch
---

The generated HTTP client and CLI now send integer ids and integer list parameters in the contract's wire form, so `get` by an integer id works through them.

A get keyed by an integer id, such as OmniPlan's tasks, resources and milestones or TV's browser and playlist windows, sent the id as the text it was given, and the operation's input rejected it. The client's `get` now takes the id as a number or as text and sends `{ integer: "<digits>" }`. A list's required integer parameter is sent the same way, and the CLI's `list` converts the flag's text to a number. So are a delete's and an update's integer ids and every integer parameter of a command, such as Automator `add`'s `atIndex`, Word `insertText`'s `at` and `createRange`'s `start` and `end`, QuickTime Player's step `by`, System Events' `usingActionNumber` and Xcode `attach`'s `toProcessIdentifier`. An optional integer that is omitted is not sent.

Refs #207
