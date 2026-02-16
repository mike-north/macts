# Phase 6: CLI Infrastructure

## Goal

Build the core CLI binary (`@macts/cli`) and the plugin generation system that produces app-specific CLI plugins (`@macts/cli-<app>`).

## Key Deliverables

1. **Core CLI Binary (@macts/cli)**
   - Main entry point: `macts`
   - Plugin discovery: finds installed `@macts/cli-*` packages
   - Global options: `--help`, `--version`, `--json`, `--verbose`
   - MCP server mode: `macts --mcp` (runs unified MCP server)
   - HTTP server mode: `macts --serve --port 3456`

2. **Plugin System**
   - Plugin interface that cli-<app> packages implement
   - Dynamic loading of plugins at runtime
   - Plugin registration with subcommand routing
   - Graceful handling of missing plugins

3. **CLI Generator**
   - Generate `@macts/cli-<app>` packages from manifests
   - Subcommand tree from hierarchy
   - Flag definitions from schemas
   - Help text from descriptions
   - Tab completion for enum values

4. **Output Formatting**
   - Human-readable output (default)
   - JSON output (`--json`)
   - Table output for lists
   - Progress indicators for long operations

5. **Generated CLI Plugin Structure**
   - `@macts/cli-calendar` as reference implementation
   - Delegates all execution to SDK
   - Validates inputs before calling SDK

## CLI Structure

```
macts                                     # Core CLI
├── --help
├── --version
├── --mcp                                 # Run as MCP server
├── --serve [--port N]                    # Run as HTTP server
│
├── calendar                              # From @macts/cli-calendar
│   ├── calendars
│   │   ├── list [--filter ...]
│   │   ├── create --name <name> [--color <color>]
│   │   └── <uid>
│   │       ├── get
│   │       ├── update [--name <name>] [--color <color>]
│   │       ├── delete
│   │       └── events
│   │           ├── list [--after <date>] [--before <date>]
│   │           ├── create --summary <s> --start-date <d> --end-date <d>
│   │           └── <uid>
│   │               ├── get
│   │               ├── update [--summary <s>] [--location <l>]
│   │               ├── delete
│   │               ├── show
│   │               └── attendees
│   │                   └── list
│   ├── reload-calendars
│   └── switch-view --to <day|week|month|year>
│
└── omnifocus                             # From @macts/cli-omnifocus (future)
    └── ...
```

## Dependencies

- Phase 0 (project foundation)
- Phase 1 (manifest schemas)
- Phase 4 (SDK generation - CLI generator reuses patterns)
- Phase 5 (Calendar SDK - CLI delegates to SDK)

## Critical Files

```
packages/cli/
├── package.json
├── src/
│   ├── index.ts              # CLI entry point
│   ├── cli.ts                # Clipanion/Commander setup
│   ├── plugin-loader.ts      # Plugin discovery and loading
│   ├── commands/
│   │   ├── root.ts           # Root command (--mcp, --serve)
│   │   └── help.ts           # Help command
│   ├── output/
│   │   ├── json.ts           # JSON formatter
│   │   ├── table.ts          # Table formatter
│   │   └── human.ts          # Human-readable formatter
│   └── utils/
│       └── completion.ts     # Tab completion helpers
└── bin/
    └── macts                 # Executable

packages/core/src/
├── generator/
│   └── cli/
│       ├── index.ts          # generateCliPlugin()
│       ├── commands.ts       # Generate command classes
│       ├── flags.ts          # Generate flags from schema
│       └── package.ts        # Generate package structure

packages/cli-calendar/        # Generated plugin
├── package.json
├── src/
│   ├── index.ts              # Plugin export
│   ├── plugin.ts             # Plugin implementation
│   └── commands/
│       ├── calendars/
│       │   ├── list.ts
│       │   ├── create.ts
│       │   └── [uid]/
│       │       ├── get.ts
│       │       ├── update.ts
│       │       ├── delete.ts
│       │       └── events/...
│       ├── reload-calendars.ts
│       └── switch-view.ts
```

## Plugin Interface

```typescript
// @macts/cli exports this interface
interface CliPlugin {
  name: string; // 'calendar'
  description: string;
  commands: Command[]; // Clipanion command classes
}

// Each @macts/cli-<app> exports a plugin
export const plugin: CliPlugin = {
  name: 'calendar',
  description: 'Calendar application commands',
  commands: [
    CalendarsListCommand,
    CalendarsCreateCommand,
    // ...
  ],
};
```

## Generated Command Example

```typescript
// Generated: CalendarsListCommand.ts
import { Command, Option } from 'clipanion';
import { Calendar } from '@macts/sdk-calendar';

export class CalendarsListCommand extends Command {
  static paths = [['calendar', 'calendars', 'list']];

  static usage = Command.Usage({
    description: 'List all calendars',
  });

  json = Option.Boolean('--json', false, {
    description: 'Output as JSON',
  });

  async execute(): Promise<number> {
    const app = new Calendar();
    const calendars = await app.calendars.list();

    if (this.json) {
      this.context.stdout.write(JSON.stringify(calendars, null, 2));
    } else {
      // Human-readable table output
      for (const cal of calendars) {
        this.context.stdout.write(`${cal.name} (${cal.uid})\n`);
      }
    }

    return 0;
  }
}
```

## Success Criteria

- [ ] `macts --help` shows available plugins
- [ ] `macts calendar calendars list` works with SDK
- [ ] `macts calendar calendars create --name "Test"` creates calendar
- [ ] `macts calendar calendars <uid> events list` traverses hierarchy
- [ ] `--json` flag produces valid JSON output
- [ ] Tab completion works for enum values (view types)
- [ ] Plugin discovery finds installed @macts/cli-\* packages
- [ ] Missing plugin shows helpful error message
- [ ] `macts --mcp` launches MCP server (stub OK for this phase)
