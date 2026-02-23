# Generate Command Usage Examples

## Basic Usage

Generate an SDK from a manifest file:

```bash
macts generate manifests/calendar/app.yaml \
  --out-dir packages/sdk-calendar \
  --package-name @macts/sdk-calendar
```

## With Custom Version

Generate an SDK with a specific version:

```bash
macts generate manifests/notes/app.yaml \
  --out-dir packages/sdk-notes \
  --package-name @macts/sdk-notes \
  --version 1.0.0
```

## Using Relative Paths

The command automatically resolves relative paths:

```bash
# From project root
macts generate ./manifests/safari/app.yaml \
  --out-dir ./packages/sdk-safari \
  --package-name @macts/sdk-safari

# From a subdirectory
cd manifests
macts generate calendar/app.yaml \
  --out-dir ../packages/sdk-calendar \
  --package-name @macts/sdk-calendar
```

## Programmatic Usage

You can also use the command programmatically:

```typescript
import { GenerateCommand } from '@macts/cli'
import { Cli } from 'clipanion'

const cli = new Cli({
  binaryName: 'my-tool',
})

cli.register(GenerateCommand)

// Run the command
await cli.run([
  'generate',
  'manifests/calendar/app.yaml',
  '--out-dir',
  'packages/sdk-calendar',
  '--package-name',
  '@macts/sdk-calendar',
])
```

## Expected Output

When successful, you'll see output like:

```
Loading manifest from /Users/you/project/manifests/calendar/app.yaml...
Generating SDK for Calendar (com.apple.Calendar)...
Writing 12 files to /Users/you/project/packages/sdk-calendar...
SDK generated successfully!

Next steps:
  cd /Users/you/project/packages/sdk-calendar
  pnpm install
  pnpm build
```

## Error Handling

### Invalid Manifest

```bash
$ macts generate invalid.yaml --out-dir ./out --package-name @test/sdk
Loading manifest from /Users/you/project/invalid.yaml...
Error: Invalid manifest: missing app.bundleId
```

### Permission Denied

```bash
$ macts generate manifest.yaml --out-dir /protected --package-name @test/sdk
Loading manifest from /Users/you/project/manifest.yaml...
Generating SDK for MyApp (com.example.myapp)...
Writing 8 files to /protected...
Error: EACCES: permission denied, mkdir '/protected'
```

### Generation Errors

```bash
$ macts generate broken-manifest.yaml --out-dir ./out --package-name @test/sdk
Loading manifest from /Users/you/project/broken-manifest.yaml...
Generating SDK for BrokenApp (com.example.broken)...
Errors during generation:
  - Failed to generate types: Property 'name' has invalid type
  - Invalid resource schema: Resource 'Document' is missing required properties
```

## Help Command

Get help on command usage:

```bash
macts generate --help
```

Output:

```
Generate an SDK package from a manifest

USAGE

  $ macts generate <manifestPath> --out-dir <outDir> --package-name <packageName> [--version <version>]

OPTIONS

  --out-dir         Output directory for generated SDK package
  --package-name    npm package name (e.g., @macts/sdk-calendar)
  --version         Package version (defaults to 0.0.0)

EXAMPLES

  Generate SDK for Calendar app
  $ macts generate manifests/calendar/app.yaml --out-dir packages/sdk-calendar --package-name @macts/sdk-calendar

  Generate SDK with custom version
  $ macts generate manifests/calendar/app.yaml --out-dir packages/sdk-calendar --package-name @macts/sdk-calendar --version 1.0.0
```

## Generated SDK Structure

After running the command, the output directory will contain:

```
sdk-calendar/
├── package.json
└── src/
    ├── index.ts                    # Main exports
    ├── Calendar.ts                 # Application class
    ├── types/
    │   ├── Event.ts               # Resource types
    │   ├── EventCreateInput.ts
    │   └── EventUpdateInput.ts
    ├── schemas/
    │   ├── EventSchema.ts         # Zod schemas
    │   ├── EventCreateInputSchema.ts
    │   └── EventUpdateInputSchema.ts
    ├── resources/
    │   └── Event.ts               # Resource classes
    └── collections/
        └── Events.ts              # Collection classes
```

## Integration with Build Tools

### With pnpm Workspace

```json
{
  "scripts": {
    "generate:calendar": "macts generate manifests/calendar/app.yaml --out-dir packages/sdk-calendar --package-name @macts/sdk-calendar",
    "generate:notes": "macts generate manifests/notes/app.yaml --out-dir packages/sdk-notes --package-name @macts/sdk-notes",
    "generate:all": "pnpm run generate:calendar && pnpm run generate:notes"
  }
}
```

### With Nx

```json
{
  "targets": {
    "generate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "macts generate manifests/calendar/app.yaml --out-dir packages/sdk-calendar --package-name @macts/sdk-calendar"
      }
    }
  }
}
```

## Troubleshooting

### Command Not Found

If you get "macts: command not found":

```bash
# Install globally
npm install -g @macts/cli

# Or use npx
npx @macts/cli generate ...

# Or use pnpm dlx
pnpm dlx @macts/cli generate ...
```

### Manifest Validation Errors

If your manifest fails validation, check:

- `app.name` and `app.bundleId` are present
- All resource names are in PascalCase
- All property types are valid
- All references (enums, resources) exist
- YAML syntax is correct

### Generated Files Don't Compile

If the generated TypeScript doesn't compile:

- Check that all custom types referenced in the manifest are defined
- Verify that resource references are correct
- Check for circular dependencies
- Ensure all required fields are marked as required

## Best Practices

1. **Version your manifests** - Use git to track changes to manifest files
2. **Regenerate after changes** - Always regenerate SDKs after modifying manifests
3. **Review generated code** - Check the generated files to ensure correctness
4. **Use workspace packages** - Keep manifests and SDKs in the same workspace
5. **Automate generation** - Add generation to your build scripts
6. **Test generated SDKs** - Write integration tests for generated SDKs
