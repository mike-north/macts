---
'@macts/core': minor
'@macts/cli': patch
---

Generated packages now record the files the generator emitted, in `.macts-generated.json`, and regenerating deletes any of them it no longer emits, so removing an operation or a resource from a manifest leaves no stale files behind. Files the generator never emitted, such as a changelog or handwritten tests, are kept. A package without a record yet takes the files carrying the generator's "do not edit" notice as its previous set.

`@macts/core` adds `writeGeneratedPackage`, which writes a package, prunes what it no longer emits and writes its record, along with `OWNED_OUTPUT_RECORD_FILE` and the `GeneratedPackageWriteResult` and `OwnedOutputSource` types. `macts generate` uses it for every target and names each deleted file on stdout.
