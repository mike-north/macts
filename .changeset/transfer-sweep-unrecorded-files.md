---
'@macts/runtime': patch
---

The transfer store's sweep now also removes files in its uploads and copies directories that no record names, once they are older than the longest transfer lifetime. Only regular files with a name the store mints are removed; links, directories and any other name are left alone. A temporary copy whose deletion is refused and whose state cannot then be read (an I/O error rather than the file being absent) now keeps its record and reports the failure, instead of being treated as refused and forgotten.
