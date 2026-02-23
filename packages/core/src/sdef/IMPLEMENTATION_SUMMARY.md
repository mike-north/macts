# SDEF Hierarchy Builder Implementation Summary

## Overview

This implementation adds the hierarchy builder for Phase 2 of the macts project. The hierarchy builder analyzes SDEF (Scripting Definition) data to construct containment trees that represent how AppleScript classes relate to each other.

## Files Created

### `/packages/core/src/sdef/hierarchy.ts`

The main implementation file that exports:

- **`buildHierarchy(sdef: RawSdefData): HierarchyResult`** - Main function that builds the containment hierarchy
- **`HierarchyResult`** interface - Contains:
  - `hierarchy: Hierarchy` - The containment tree structure
  - `resources: Set<string>` - Classes that contain other classes (have elements)
  - `valueTypes: Set<string>` - Classes with no elements (leaf nodes)
  - `ambiguousClasses: Map<string, string[]>` - Classes with multiple parents
  - `rootClass: string | undefined` - The root class (typically 'application')

### `/packages/core/src/sdef/hierarchy.test.ts`

Comprehensive test suite with 17 test cases covering:

1. **Simple two-level hierarchy** - Basic application → documents relationships
2. **Deep hierarchy** - Multi-level nesting (application → calendars → events → attendees)
3. **Resource vs value type detection** - Identifying which classes can contain others
4. **Ambiguous class detection** - Classes with multiple parents
5. **Circular reference handling** - Gracefully handling self-referential relationships
6. **Root class detection** - Finding the top-level class
7. **Plural name handling** - Using proper plural forms for collection keys
8. **Multi-suite handling** - Collecting classes from multiple SDEF suites
9. **Empty cases** - Handling edge cases with no data
10. **Description handling** - Preserving documentation

### `/packages/core/src/sdef/index.ts`

Public API exports for the SDEF module, including all types and functions.

## Implementation Details

### Algorithm

The `buildHierarchy` function follows these steps:

1. **Collect all classes** from all SDEF suites into a unified map
2. **Classify classes** as resources (have elements) or value types (no elements)
3. **Build parent→child map** by analyzing element containment
4. **Find root class** (named 'application' or has no parents)
5. **Detect ambiguous classes** (classes with multiple parents)
6. **Build recursive hierarchy tree** starting from root, using plural names as keys
7. **Return complete analysis** with hierarchy and metadata

### Key Design Decisions

1. **Type Safety** - All code passes strict TypeScript checks with:
   - `strict: true`
   - `noUncheckedIndexedAccess: true`
   - `noPropertyAccessFromIndexSignature: true`
   - `exactOptionalPropertyTypes: true`

2. **Circular Reference Prevention** - Uses a visited set during tree construction to prevent infinite recursion

3. **Plural Name Preference** - Uses class `plural` field when available, falls back to class name

4. **Access Mode Preservation** - Maintains read-only vs read-write distinction from SDEF

5. **Description Preservation** - Carries over human-readable descriptions into hierarchy

## Test Coverage

All 17 tests pass, covering:

- ✅ Positive cases (expected behavior)
- ✅ Negative cases (error handling)
- ✅ Edge cases (empty arrays, missing data, circular references)
- ✅ Type narrowing (resources vs value types)
- ✅ Complex hierarchies (3+ levels deep)

## Integration

The hierarchy builder integrates with:

- **Existing SDEF types** (`RawSdefData`, `RawClass`, `RawElement`)
- **Manifest schemas** (`Hierarchy`, `HierarchyChild` from `manifest/schemas/hierarchy.ts`)
- **Package exports** (re-exported through `src/index.ts`)

## Usage Example

```typescript
import { buildHierarchy } from '@macts/core'
import type { RawSdefData } from '@macts/core'

const sdef: RawSdefData = {
  title: 'Calendar',
  suites: [
    {
      name: 'Calendar Suite',
      code: 'wres',
      classes: [
        {
          name: 'application',
          code: 'capp',
          elements: [{ type: 'calendar', access: 'rw' }],
          properties: [],
        },
        {
          name: 'calendar',
          code: 'wres',
          plural: 'calendars',
          elements: [{ type: 'event', access: 'rw' }],
          properties: [],
        },
        // ... more classes
      ],
      commands: [],
      enumerations: [],
    },
  ],
}

const result = buildHierarchy(sdef)

console.log(result.rootClass) // 'application'
console.log(result.resources) // Set(['application', 'calendar'])
console.log(result.hierarchy.children.calendars)
// {
//   resource: 'calendar',
//   access: 'rw',
//   children: {
//     events: { resource: 'event', access: 'rw', ... }
//   }
// }
```

## Next Steps

This implementation completes the hierarchy building portion of Phase 2. The next steps would be:

1. **SDEF XML Parser** - Parse `.sdef` XML files into `RawSdefData`
2. **Dictionary Extraction** - Extract SDEF from app bundles
3. **Inflection Handling** - Proper singular/plural conversion
4. **Complete Phase 2** - Integrate all SDEF parsing components

## Notes

- The implementation follows all TypeScript best practices from the project's CLAUDE.md rules
- Uses `forEach` instead of `for...of` on Maps to avoid iteration protocol issues
- All tests use proper type guards to satisfy strict null checks
- Test descriptions clearly state what is being tested (the "why" not just the "what")
