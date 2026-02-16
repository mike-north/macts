# macts Project Phases

This directory contains the implementation roadmap for macts, broken into sequential phases.

## Phase Overview

| Phase | Name                                             | Dependencies | Description                         |
| ----- | ------------------------------------------------ | ------------ | ----------------------------------- |
| 0     | [Foundation](./00-foundation.md)                 | -            | Monorepo setup, tooling, CI/CD      |
| 1     | [Manifest Schema](./01-manifest-schema.md)       | 0            | Zod schemas for manifest format     |
| 2     | [SDEF Parser](./02-sdef-parser.md)               | 0, 1         | Parse AppleScript dictionaries      |
| 3     | [JXA Bridge](./03-jxa-bridge.md)                 | 0, 1         | Runtime JXA execution layer         |
| 4     | [SDK Generation](./04-sdk-generation.md)         | 0, 1, 3      | Code generation pipeline            |
| 5     | [Calendar SDK](./05-calendar-sdk.md)             | 0-4          | First complete SDK (vertical slice) |
| 6     | [CLI Infrastructure](./06-cli-infrastructure.md) | 0, 1, 4, 5   | Core CLI + plugin system            |
| 7     | [MCP Infrastructure](./07-mcp-infrastructure.md) | 0, 1, 4, 5   | Core MCP server + plugin system     |
| 8     | [HTTP API](./08-http-api.md)                     | 0, 1, 4, 5   | Core HTTP server + plugin system    |
| 9     | [Agentic Extraction](./09-agentic-extraction.md) | 0, 1, 2, 3   | Agent-assisted manifest creation    |
| 10    | [Expansion & Polish](./10-expansion-polish.md)   | 0-9          | More apps, documentation, release   |
| 11    | [SQL Interface](./11-sql-interface.md)           | 0-8          | Speculative: SQL query interface    |

## Dependency Graph

```
Phase 0: Foundation
    │
    ├─► Phase 1: Manifest Schema
    │       │
    │       ├─► Phase 2: SDEF Parser ─────────────┐
    │       │                                      │
    │       └─► Phase 3: JXA Bridge               │
    │               │                              │
    │               └─► Phase 4: SDK Generation    │
    │                       │                      │
    │                       └─► Phase 5: Calendar SDK
    │                               │
    │                               ├─► Phase 6: CLI
    │                               │
    │                               ├─► Phase 7: MCP
    │                               │
    │                               └─► Phase 8: HTTP API
    │                                       │
    │                                       └─► Phase 11: SQL (speculative)
    │
    └─► Phase 9: Agentic Extraction ◄────────────┘
            │
            └─► Phase 10: Expansion & Polish
```

## Parallelization Opportunities

After Phase 5 (Calendar SDK), phases 6, 7, and 8 can be developed in parallel:

```
Phase 5 ─┬─► Phase 6: CLI
         │
         ├─► Phase 7: MCP
         │
         └─► Phase 8: HTTP API
```

Phase 9 (Agentic Extraction) can begin as early as Phase 3 since it only needs the SDEF parser and JXA bridge, not the full SDK generation pipeline.

## Vertical Slice Strategy

The phases are designed to produce a working vertical slice as early as possible:

1. **Phases 0-5**: Complete end-to-end for Calendar
   - Can list, create, update, delete calendars and events
   - Proves the entire architecture works

2. **Phases 6-8**: Add integration surfaces
   - Each phase adds a new way to interact with the same functionality
   - CLI, MCP, HTTP API all use the same SDK underneath

3. **Phases 9-10**: Scale and polish
   - Enable contributions from people with different apps
   - Add more apps using the proven pipeline

## Key Milestones

- **M1**: `pnpm build` passes (end of Phase 0)
- **M2**: Hand-written Calendar manifest validates (end of Phase 1)
- **M3**: Calendar.sdef extracts and parses (end of Phase 2)
- **M4**: Can execute JXA and list calendars (end of Phase 3)
- **M5**: SDK generates from manifest (end of Phase 4)
- **M6**: Calendar SDK passes all integration tests (end of Phase 5)
- **M7**: CLI works end-to-end (end of Phase 6)
- **M8**: MCP server works with Claude Code (end of Phase 7)
- **M9**: HTTP API with OpenAPI docs (end of Phase 8)
- **M10**: Contributor can add new app manifest (end of Phase 9)
- **M11**: Multiple apps published (end of Phase 10)
