---
'@macts/core': minor
'@macts/cli': patch
---

A manifest resource can now say which class it inherits, and it then gets what that class declares.

A resource whose class in the app's dictionary inherits another class records `inherits: { resource, evidence }`. `resource` is the key of the superclass in the same manifest, and the evidence is the superclass's name as the dictionary writes it. Every reader of a manifest sees the resource with what it inherits:

- each property of its ancestors that it does not declare, nearest first, with its code, native spelling, any `unsupported` marker, and every claim the ancestor records about it (nullability and resettability, whatever their evidence);
- the nearest ancestor's identifiers, when it declares none, with their uniqueness claims, targeting and runtime property.

A resource replaces an inherited claim with its own evidence through `inheritedClaims.<property>`, a claims-only overlay that states a nullability claim, a resettability claim or an `unsupported` marker without redeclaring the property. Each claim the overlay states replaces the inherited one, the others stay inherited, and the resource's own subclasses inherit the result. An overlay on a resource with no superclass, on a property the resource declares itself, on a property no ancestor declares, or with no claim, is a manifest error. A property the resource declares replaces the inherited one whole. Commands, the hierarchy and collection-level fields are not inherited. A superclass the manifest does not declare, and a chain of superclasses that loops, are manifest errors. A resource's own rules hold for what it inherits: an inherited property whose type the manifest marks unsupported is an error on the resource that declares it.

`macts probe --nullability` writes a claim about an inherited property as the resource's overlay. `writeNullabilityResults` reports each claim it had nowhere to write in `notWritten`, and the command names each one on its own line.

`Resource` gains the optional `inherits` and `inheritedClaims` fields, described by the new `ResourceInheritsSchema` and `PropertyClaimsSchema`. `DictionaryTermEvidenceSchema` (and its `DictionaryTermEvidence` type) is the dictionary evidence that both `inherits` and native spellings record.
