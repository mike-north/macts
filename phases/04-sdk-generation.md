# Phase 4: SDK Generation

## Goal

Build the code generation pipeline that transforms manifests into fully-typed TypeScript SDKs. This phase creates the generator infrastructure; Phase 5 will produce the first real SDK.

## Key Deliverables

1. **Generator Framework**
   - Template system for generating TypeScript code
   - AST-based generation (ts-morph) for type safety
   - Consistent formatting with Prettier
   - Source map support for debugging

2. **Resource Class Generator**
   - Generate `CalendarInstance` classes from resource definitions
   - Instance methods: `update()`, `delete()`, resource-scoped commands
   - Child collection accessors: `.events`, `.attendees`
   - Property getters with correct types

3. **Collection Class Generator**
   - Generate `CalendarCollection` classes for each hierarchy level
   - Methods: `list()`, `get(id)`, `create(input)`
   - Filter support on `list()`
   - Pagination (if applicable)

4. **Type Generator**
   - `Calendar` - full read type (all properties)
   - `CalendarCreateInput` - writable required + optional properties
   - `CalendarUpdateInput` - writable properties, all optional
   - Enum types as string literal unions
   - Value type interfaces

5. **Zod Schema Generator**
   - Generate Zod schemas from manifest for runtime validation
   - `CalendarSchema`, `CalendarCreateInputSchema`, etc.
   - Consistent error messages across all surfaces

6. **Application Class Generator**
   - Root SDK class: `new Calendar()`
   - Top-level collection accessors: `.calendars`
   - App-level commands: `.reloadCalendars()`, `.switchView()`

7. **Package Generator**
   - Generate complete `@macts/sdk-<app>` package structure
   - package.json with correct dependencies
   - tsconfig.json extending base config
   - Entry point with exports
   - API Extractor configuration

## Dependencies

- Phase 0 (project foundation)
- Phase 1 (manifest schemas)
- Phase 3 (JXA bridge - SDK delegates to this)

## Critical Files

```
packages/core/src/
├── generator/
│   ├── index.ts              # Public API: generateSdk()
│   ├── context.ts            # Generation context (manifest, options)
│   ├── resource.ts           # Resource class generator
│   ├── collection.ts         # Collection class generator
│   ├── types.ts              # Type/interface generator
│   ├── schemas.ts            # Zod schema generator
│   ├── application.ts        # Root application class generator
│   ├── package.ts            # Package scaffolding generator
│   └── templates/
│       ├── resource.ts.ejs   # Resource class template
│       ├── collection.ts.ejs # Collection class template
│       └── index.ts.ejs      # Entry point template
```

## Generated SDK Structure

```
packages/sdk-calendar/
├── package.json
├── tsconfig.json
├── api-extractor.json
├── src/
│   ├── index.ts              # Public exports
│   ├── Calendar.ts           # Root application class
│   ├── resources/
│   │   ├── CalendarResource.ts
│   │   ├── EventResource.ts
│   │   ├── AttendeeResource.ts
│   │   └── AlarmResource.ts
│   ├── collections/
│   │   ├── CalendarCollection.ts
│   │   ├── EventCollection.ts
│   │   ├── AttendeeCollection.ts
│   │   └── AlarmCollection.ts
│   ├── types/
│   │   ├── Calendar.ts       # Read type
│   │   ├── CalendarInput.ts  # Create/Update input types
│   │   ├── Event.ts
│   │   └── ...
│   ├── schemas/
│   │   ├── calendar.ts       # Zod schemas
│   │   ├── event.ts
│   │   └── ...
│   └── enums/
│       ├── ParticipationStatus.ts
│       ├── EventStatus.ts
│       └── ViewType.ts
├── dist/                     # Built output
└── api-report/               # API Extractor output
```

## Generated Code Example

```typescript
// Generated: CalendarResource.ts
export class CalendarInstance {
  readonly #executor: JxaExecutor;
  readonly #specifier: ObjectSpecifier;

  constructor(executor: JxaExecutor, specifier: ObjectSpecifier, data: Calendar) {
    this.#executor = executor;
    this.#specifier = specifier;
    Object.assign(this, data);
  }

  // Read-only property
  get uid(): string {
    return this._data.uid;
  }

  // Read-write property
  get name(): string {
    return this._data.name;
  }

  // Child collection accessor
  get events(): EventCollection {
    return new EventCollection(this.#executor, this.#specifier.collection('events'));
  }

  // Update method (only writable properties)
  async update(input: CalendarUpdateInput): Promise<void> {
    CalendarUpdateInputSchema.parse(input);
    // ... generate JXA set commands
  }

  // Resource-scoped command
  async show(): Promise<void> {
    await this.#executor.command(this.#specifier, 'show');
  }
}
```

## Success Criteria

- [ ] Generator produces syntactically valid TypeScript
- [ ] Generated code compiles without errors
- [ ] Generated Zod schemas match manifest definitions
- [ ] Generated types have correct read-only vs writable properties
- [ ] API Extractor produces clean .d.ts rollup
- [ ] Dry run: generate Calendar SDK structure (may not execute yet)
