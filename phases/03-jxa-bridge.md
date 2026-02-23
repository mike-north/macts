# Phase 3: JXA Bridge

## Goal

Build the runtime layer that executes JXA (JavaScript for Automation) code from TypeScript. This is the foundation that all SDK execution flows through.

## Key Deliverables

1. **JXA Executor**
   - Execute JXA code via `osascript -l JavaScript`
   - Use `@jxa/run` as the underlying execution mechanism
   - Handle serialization/deserialization of arguments and results
   - Proper error handling with informative messages

2. **Object Specifier Builder**
   - Construct JXA object specifier chains programmatically
   - Example: `Application('Calendar').calendars.byId('work-uid').events()`
   - Support for:
     - `byId(id)` - select by identifier
     - `byName(name)` - select by name
     - `at(index)` - select by index
     - `whose({...})` - filtered selection
     - Chained traversal through hierarchy

3. **Type Coercion Layer**
   - Convert TypeScript values to JXA-compatible values
   - Convert JXA results to TypeScript types
   - Handle:
     - Dates (JavaScript Date ↔ AppleScript date)
     - Enums (string literals ↔ AppleScript enum codes)
     - Arrays
     - References (object specifiers → string IDs)
     - Null/missing values

4. **Standardized Type Representations**
   - Define canonical formats for well-known types:
     - `DateType` - ISO 8601 strings or Date objects
     - `ColorType` - Hex strings (#RRGGBB)
     - `DurationType` - ISO 8601 durations or milliseconds
     - `PathType` - POSIX path strings
   - Zod schemas for each standardized type
   - Coercion functions for each type

5. **Application Connection**
   - `connect(bundleId: string)` - get Application reference
   - `activate()` - bring app to foreground
   - `isRunning()` - check if app is currently running
   - Handle TCC permissions gracefully

## Dependencies

- Phase 0 (project foundation)
- Phase 1 (manifest schemas - for type definitions)

## Critical Files

```
packages/core/src/
├── jxa/
│   ├── index.ts              # Public API exports
│   ├── executor.ts           # Run JXA code via @jxa/run
│   ├── specifier.ts          # Object specifier builder
│   ├── coercion.ts           # Type coercion layer
│   └── connection.ts         # Application connection management
├── types/
│   ├── standardized.ts       # DateType, ColorType, etc.
│   └── coercion.ts           # Coercion function types
```

## JXA Execution Model

```typescript
// High-level API the SDK will use
interface JxaExecutor {
  // Execute raw JXA code
  run<T>(code: string): Promise<T>

  // Execute with context (app connection)
  withApp<T>(bundleId: string, code: (app: Application) => T): Promise<T>

  // Build and execute object specifier chain
  query(specifier: ObjectSpecifier): Promise<unknown>

  // Execute command on object
  command(
    specifier: ObjectSpecifier,
    command: string,
    params?: Record<string, unknown>
  ): Promise<unknown>
}

// Object specifier builder
interface ObjectSpecifier {
  app(bundleId: string): ObjectSpecifier
  collection(name: string): ObjectSpecifier
  byId(id: string): ObjectSpecifier
  byName(name: string): ObjectSpecifier
  whose(predicate: Record<string, unknown>): ObjectSpecifier
  property(name: string): ObjectSpecifier

  // Terminal operations
  get(): string // Generate JXA code to get value
  set(value: unknown): string // Generate JXA code to set value
  make(properties: Record<string, unknown>): string // Generate make command
  delete(): string // Generate delete command
}
```

## Type Coercion Examples

```typescript
// Date coercion
const coerceDate = {
  toJxa: (d: Date) => `new Date("${d.toISOString()}")`,
  fromJxa: (v: string | number) => new Date(v),
}

// Enum coercion (using manifest enum definitions)
const coerceEnum = (enumDef: EnumDefinition) => ({
  toJxa: (v: string) => `"${enumDef.values.find((e) => e.name === v)?.code}"`,
  fromJxa: (code: string) => enumDef.values.find((e) => e.code === code)?.name,
})

// Color coercion
const coerceColor = {
  toJxa: (hex: string) => {
    const [r, g, b] = hexToRgb(hex)
    return `{${r * 257}, ${g * 257}, ${b * 257}}` // AppleScript uses 16-bit color
  },
  fromJxa: (rgb: [number, number, number]) => rgbToHex(rgb.map((v) => v / 257)),
}
```

## Success Criteria

- [ ] Can execute arbitrary JXA code and get typed results
- [ ] Object specifier builder generates valid JXA traversal code
- [ ] Date coercion works correctly (timezone handling)
- [ ] Can connect to Calendar app and list calendars
- [ ] Can create and delete a calendar event
- [ ] Graceful error handling when app not running or TCC denied
- [ ] Test coverage for all coercion functions
