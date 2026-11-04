---
'@macts/core': patch
---

Generated app packages now include a `.gitattributes` that marks the files the generator owns there as `linguist-generated`: the whole `src/` tree, the build, TypeScript and API Extractor configuration, `LICENSE`, `.gitignore`, the `.macts-generated.json` record and the `.gitattributes` itself. Because they are marked `linguist-generated`, GitHub collapses these files in pull-request diffs and leaves them out of the repository's language statistics, so a change that regenerates packages shows its generated code as generated, and review-size checks that honour the attribute stop counting it as hand-written. `package.json` is left unmarked, because its version and dependency changes are meant to be reviewed. The file is listed in each package's `.macts-generated.json` like any other generated file, and it is not published: the packages' `files` field still includes only `dist`.
