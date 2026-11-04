---
'@macts/core': minor
---

A manifest resource can now say which class it inherits, and it then gets what that class declares.

A resource whose class in the app's dictionary inherits another class records `inherits: { resource, evidence }`. `resource` is the key of the superclass in the same manifest, and the evidence is the superclass's name as the dictionary writes it. Every reader of a manifest sees the resource with what it inherits:

- each property of its ancestors that it does not declare, nearest first, with its code, native spelling and any `unsupported` marker;
- the nearest ancestor's identifiers, when it declares none, without their uniqueness claims.

A property the resource declares replaces the inherited one whole. That is how a resource marks an inherited property unsupported with its own evidence. Claims about the superclass's own items stay with the superclass: a probe or curated nullability claim, a resettability claim, and identifier uniqueness. Commands, the hierarchy and collection-level fields are not inherited. A superclass the manifest does not declare, and a chain of superclasses that loops, are manifest errors.

`Resource` gains the optional `inherits` field, described by the new `ResourceInheritsSchema`. `DictionaryTermEvidenceSchema` (and its `DictionaryTermEvidence` type) is the dictionary evidence that both `inherits` and native spellings record. `DictionarySpellingEvidenceSchema` and `DictionarySpellingEvidence` remain as deprecated aliases for it.
