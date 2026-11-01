---
'@macts/core': patch
'@macts/arc': patch
'@macts/console': patch
'@macts/contacts': patch
'@macts/finder': patch
'@macts/google-chrome': patch
'@macts/iterm': patch
'@macts/mail': patch
'@macts/messages': patch
'@macts/music': patch
'@macts/notes': patch
'@macts/quicktime-player': patch
'@macts/safari': patch
'@macts/spotify': patch
'@macts/system-events': patch
'@macts/system-settings': patch
'@macts/terminal': patch
'@macts/tv': patch
---

Discovery reports the permission every operation requires. A capability's permission was reported only when the manifest declared one, so most capabilities showed no permission although the server enforces one for every operation. Each capability, in the capability registry, in discovery and CLI search output, and in every generated `capabilities.ts`, now reports the permission the server enforces for its route: the declared one, else the one derived from the route, such as `notes:attachments:get`.
