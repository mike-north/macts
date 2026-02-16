# Phase 2: SDEF Parser

## Goal

Build a parser that transforms AppleScript dictionary files (`.sdef` XML) into the manifest format defined in Phase 1. This is the "mechanical extraction" step - deterministic transformation without judgment calls.

## Key Deliverables

1. **SDEF XML Parser**
   - Parse `.sdef` files (XML format)
   - Extract all structural elements:
     - Suites (name, code, description)
     - Classes (name, code, description, plural, inherits)
     - Properties (name, code, type, access, description)
     - Elements (contained classes with access mode)
     - Commands (name, code, description, parameters, results)
     - Enumerations (name, code, values)
     - Synonyms and cocoa keys

2. **Dictionary Extraction Helper**
   - CLI command: `macts extract-dictionary "App Name"`
   - Locate app bundle by name
   - Extract `.sdef` from bundle resources
   - Handle apps that use `.scriptSuite`/`.scriptTerminology` (older format)

3. **Intermediate Representation**
   - `RawSdefData` type - faithful representation of SDEF structure
   - Preserves all four-character codes
   - Preserves inheritance relationships
   - Preserves deprecation markers
   - No transformation or interpretation yet

4. **Hierarchy Builder**
   - Analyze element containment to build hierarchy tree
   - Detect resources vs value types (classes with elements = resources)
   - Identify the root (application class)
   - Flag ambiguities (multiple parents, circular refs)

5. **Inflection Handling**
   - Use `inflected` package for singular/plural normalization
   - Handle irregular forms (person/people, index/indices)
   - Map dictionary plurals to manifest plural fields

## Reference Implementation

Clone and study `@jxa/sdef-to-dts` for XML parsing patterns:

```bash
git clone https://github.com/user/jxa /tmp/jxa-reference
```

Key files to study:

- SDEF parsing logic
- Type extraction patterns
- How they handle inheritance

## Dependencies

- Phase 0 (project foundation)
- Phase 1 (manifest schemas - needed as output target)

## Critical Files

```
packages/core/src/
├── sdef/
│   ├── index.ts              # Public API exports
│   ├── parser.ts             # XML → RawSdefData
│   ├── types.ts              # RawSdefData, RawClass, RawCommand, etc.
│   ├── hierarchy.ts          # Build containment tree
│   ├── inflection.ts         # Singular/plural handling
│   └── extractor.ts          # Extract .sdef from app bundle
├── cli/
│   └── extract-dictionary.ts # CLI command implementation
```

## SDEF Structure Reference

```xml
<dictionary title="Calendar">
  <suite name="Standard Suite" code="core">
    <class name="application" code="capp" plural="applications">
      <element type="calendar" access="rw"/>
      <property name="name" code="pnam" type="text" access="r"/>
    </class>
    <command name="make" code="corecrel">
      <parameter name="new" code="kocl" type="type"/>
      <parameter name="at" code="insh" type="location specifier" optional="yes"/>
      <result type="specifier"/>
    </command>
  </suite>
  <suite name="Calendar Suite" code="wres">
    <class name="calendar" code="wres" plural="calendars">
      <element type="event" access="rw"/>
      <property name="name" code="pnam" type="text" access="rw"/>
      <property name="uid" code="ID  " type="text" access="r"/>
    </class>
    <enumeration name="participation status" code="epst">
      <enumerator name="accepted" code="eacc"/>
      <enumerator name="declined" code="edec"/>
    </enumeration>
  </suite>
</dictionary>
```

## Success Criteria

- [ ] Parser extracts all suites, classes, properties, elements, commands, enums
- [ ] Four-character codes preserved for all elements
- [ ] Hierarchy builder produces correct containment tree for Calendar
- [ ] `macts extract-dictionary "Calendar"` extracts Calendar.sdef
- [ ] Handles inheritance (`inherits` attribute on classes)
- [ ] Handles deprecated/obsolete markers
- [ ] Test coverage with real-world SDEF files (Calendar, Finder, Safari)
