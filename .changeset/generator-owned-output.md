---
'@macts/core': minor
'@macts/cli': minor
---

Generated packages now record the files the generator emitted, in `.macts-generated.json`, and regenerating deletes any of them it no longer emits, so removing an operation or a resource from a manifest leaves no stale files behind. Files the generator never emitted, such as a changelog or handwritten tests, are kept. A package without a record yet takes the files carrying the generator's "do not edit" notice as its previous set; this applies only to a directory holding a `package.json`, and never reaches into a nested package, so an output directory that holds other packages loses none of their files.

`@macts/core` adds `writeGeneratedPackage`, which writes a package, prunes what it no longer emits and writes its record, along with `OWNED_OUTPUT_RECORD_FILE` and the `GeneratedPackageWriteResult` and `OwnedOutputSource` types (`record`, `headers`, or `none` for a directory that is not yet a package). `macts generate` uses it for every target and names each deleted file on stdout.
