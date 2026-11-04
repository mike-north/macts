---
'@macts/core': minor
'@macts/system-events': minor
---

A manifest resource can now say which class it inherits, and it then gets what that class declares.

A resource whose class in the app's dictionary inherits another class records `inherits: { resource, evidence }`. `resource` is the key of the superclass in the same manifest, and the evidence is the superclass's name as the dictionary writes it. Every reader of a manifest sees the resource with what it inherits:

- each property of its ancestors that it does not declare, nearest first, with its code, native spelling and any `unsupported` marker;
- the nearest ancestor's identifiers, when it declares none.

A property the resource declares replaces the inherited one, so the resource can mark an inherited property unsupported with its own evidence. Claims about the superclass's own items stay with the superclass and are not inherited: probe or curated nullability, resettability and identifier uniqueness. A superclass the manifest does not declare, and a chain of superclasses that loops, are manifest errors. `Resource` gains the optional `inherits` field. `DictionaryTermEvidenceSchema` is the dictionary evidence both `inherits` and native spellings record, and `DictionarySpellingEvidenceSchema` stays as another name for it.

In System Events, a folder now inherits a disk item, and the user and Classic domains inherit a domain:

- `Folder` records have a disk item's fields: name, POSIX path, size, dates and the rest. The disk item a folder is in is left out of output until disk items can be read.
- `UserDomainObject` and `ClassicDomainObject` records have the domain's `id` and `name`. Their folders are left out of output until folders can be read.
