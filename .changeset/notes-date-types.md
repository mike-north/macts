---
'@macts/notes': minor
'@macts/notes-server': minor
---

Notes and attachments now type `creationDate` and `modificationDate` as `Date`, as the Notes dictionary declares them. They used to be typed as strings, so listing attachments failed decode against the real app ("Expected a string, received a date"). Breaking for callers that read these fields as strings.
