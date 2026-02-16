# Phase 1: Manifest Schema

## Goal

Define the complete manifest format as Zod schemas. This is the contract between the SDEF parser (producer) and all generators (consumers). Getting this right is critical - every downstream phase depends on it.

## Key Deliverables

1. **Core Manifest Schemas** (`@macts/core`)
   - `AppManifestSchema` - top-level manifest structure
   - `ResourceSchema` - resource type definitions with properties, identifiers, access modes
   - `CommandSchema` - command definitions with scope, inputs, outputs
   - `EnumSchema` - enumeration definitions
   - `HierarchySchema` - containment tree structure
   - `RelationshipSchema` - non-hierarchical references
   - `ValueTypeSchema` - plain data shapes (non-resource types)

2. **Property Type System**
   - `PropertySchema` - individual property definitions
   - `AccessMode` - `r` | `rw` discriminator
   - `PropertyType` - string, number, boolean, date, enum reference, array types
   - Support for inheritance (`discriminator`, `variants`, `abstract`)

3. **Metadata Schemas**
   - `SuiteSchema` - suite organization from dictionary
   - `DeprecationSchema` - upstream vs macts deprecations
   - `ConfidenceSchema` - extraction confidence scores
   - `OpenQuestionSchema` - unresolved questions from extraction
   - `AppMetadataSchema` - bundle ID, icon, TCC entitlements, distribution model

4. **JSON Schema Export**
   - Utility to convert Zod schemas to JSON Schema files
   - `$id` generation following `macts://<app>/<type>/<name>` pattern
   - `$ref` support for cross-references

5. **Manifest Loader**
   - Parse `app.yaml` and validate against schemas
   - Load referenced JSON Schema files
   - Construct typed manifest object

## Dependencies

- Phase 0 (project foundation)

## Critical Files

```
packages/core/src/
├── manifest/
│   ├── index.ts              # Public API exports
│   ├── schemas/
│   │   ├── app.ts            # Top-level AppManifestSchema
│   │   ├── resource.ts       # ResourceSchema
│   │   ├── command.ts        # CommandSchema
│   │   ├── enum.ts           # EnumSchema
│   │   ├── hierarchy.ts      # HierarchySchema
│   │   ├── relationship.ts   # RelationshipSchema
│   │   ├── property.ts       # PropertySchema, AccessMode
│   │   ├── value-type.ts     # ValueTypeSchema
│   │   ├── metadata.ts       # Suite, deprecation, confidence
│   │   └── inheritance.ts    # Discriminator, variants, abstract
│   ├── loader.ts             # YAML parsing + validation
│   └── json-schema.ts        # Zod → JSON Schema conversion
└── types/
    └── manifest.ts           # Inferred TypeScript types
```

## Design Decisions

### Property Access Model

```typescript
const PropertyAccessSchema = z.enum(['r', 'rw']);

const PropertySchema = z.object({
  access: PropertyAccessSchema,
  type: z.string().optional(), // Defaults to 'string'
  enum: z.string().optional(), // Reference to enum definition
  description: z.string(),
  code: z.string().length(4).optional(), // AppleScript four-char code
  default: z.unknown().optional(),
});
```

### Inheritance Model

```typescript
const InheritanceSchema = z.object({
  discriminator: z.string(),
  abstract: z.boolean().default(false),
  variants: z.record(z.lazy(() => ResourceSchema)),
});
```

### Hierarchy Access

```typescript
const HierarchyChildSchema = z.object({
  resource: z.string(),
  access: PropertyAccessSchema, // rw = can create/delete, r = read-only
});
```

## Success Criteria

- [ ] All manifest schemas defined and exported from `@macts/core`
- [ ] Types inferred correctly (`z.infer<typeof AppManifestSchema>`)
- [ ] JSON Schema export produces valid JSON Schema Draft 2020-12
- [ ] Manifest loader can parse and validate a hand-written Calendar manifest
- [ ] Full test coverage for schema validation (positive and negative cases)
- [ ] Documentation of manifest format in TSDoc comments
