---
'@macts/core': minor
---

A manifest can say that a property of a resource with a single instance is absent because of the data, not the app's structure.

A probe tells the two kinds of absence apart only across several instances: a property some instances read is nullable, and one that every instance fails to read is `unsupported`. A singleton root with one kind has one instance, so one failed read cannot show which it is. On such a resource, curated nullability evidence can record `absentReads`: the probe's failed reads (`observedAt`, `bundleId`, `appVersion`, `osVersion`, `failedReads`, and `errorNumbers`, which must be -1728 only) and a `reason` saying why the absence depends on the data. The claim must be `nullable: true`. A read of that property failing with -1728 then returns `null`, as it does for probe evidence of absence, and the generated SDK's documentation gives the reason and the reads.

The manifest schema rejects `absentReads` without a reason, on a command parameter, and on a resource with several instances (one reached through a collection, or a root with more than one kind), whether the resource declares the property or states a claim about one it inherits. A superclass's claim reaches its subclasses only once the superclass is valid, so a claim on a superclass with several instances is rejected even if a subclass has one. Each rejection points to probe evidence or to `unsupported` instead.

`readsAbsentAsNull` now also takes the resource the property belongs to (`ClaimResource`). New exports: `hasSingleInstance`, `checkCuratedAbsence`, `CuratedAbsentReadsSchema` and its type.
