# Contributing to macts

Thank you for your interest in contributing to macts. This guide covers how to set up your development environment, how contributions are structured, and how to add support for new macOS applications.

## Getting Started

### Prerequisites

- **macOS** - macts uses JXA (JavaScript for Automation), which is macOS-only
- **Node.js 22+**
- **pnpm** - this project uses pnpm as its package manager

### Setup

```bash
git clone https://github.com/mike-north/macts.git
cd macts
pnpm install
pnpm build
pnpm test
```

### Project Structure

```
macts/
  manifests/           # YAML manifests describing macOS app interfaces
    calendar/
      app.yaml
    reminders/
      app.yaml
    ...
  packages/
    core/              # Manifest schemas, code generators, JXA bridge
    cli/               # CLI tool (macts command)
    mcp/               # MCP server framework
    api/               # HTTP API server
    calendar/          # Generated client package (SDK + CLI plugin)
    calendar-server/   # Generated server package (API + MCP plugin)
    ...
```

Infrastructure packages (`core`, `cli`, `mcp`, `api`) are hand-written. App packages (`calendar`, `calendar-server`, etc.) are generated from manifests.

### Development Workflow

```bash
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm typecheck        # Type-check all packages
pnpm format           # Format with Prettier
```

Individual packages can be targeted with pnpm's filter:

```bash
pnpm --filter @macts/cli test
pnpm --filter @macts/core build
```

### Changesets

This project uses [changesets](https://github.com/changesets/changesets) for versioning. When making changes that affect published packages, create a changeset:

```bash
pnpm changeset
```

Follow the prompts to describe your changes. Changesets are committed alongside the code and consumed during release.

See [RELEASING.md](RELEASING.md) for how those changesets turn into published npm releases.

## Types of Contributions

### Adding Support for a New macOS Application

This is the most common type of contribution. See [Adding a New App](#adding-a-new-app) below.

### Improving an Existing Manifest

Existing manifests may be incomplete -- missing resources, properties, or commands that the app's scripting dictionary supports. Improvements are welcome. Run `sdef /path/to/App.app` to see the full dictionary and compare against the manifest.

### Infrastructure Changes

Changes to the code generator, CLI framework, MCP server, or API server. These are more complex and should be discussed in an issue first.

### Bug Fixes

Bug reports and fixes are always welcome. Please include reproduction steps when filing issues.

## Adding a New App

### Which Apps Are Appropriate?

macts supports **public macOS applications** that have AppleScript/JXA scripting dictionaries. Contributions should benefit a wide range of users.

**Good candidates:**

- macOS system applications (Calendar, Reminders, Photos, etc.)
- Widely-used third-party applications available from the Mac App Store or developer websites (OmniFocus, Xcode, Microsoft Word, etc.)
- Developer tools with broad adoption (Xcode, iTerm, etc.)

**Not appropriate:**

- Internal corporate applications
- Personal or "just for me" applications with a handful of users
- Applications without an AppleScript scripting dictionary (check with `sdef /path/to/App.app`)
- Applications that are functionally identical to one already supported (e.g., don't add another Chromium browser if Chrome and Edge are already covered, unless the scripting dictionary differs meaningfully)

**Priority order:** system apps > widely-used third-party apps > niche developer tools

### Step-by-Step Guide

#### 1. Verify the App is Scriptable

```bash
sdef /Applications/YourApp.app
```

If this returns XML, the app has a scripting dictionary. If it returns an error, the app is not scriptable and cannot be added to macts.

Some apps require being launched first:

```bash
open -a "YourApp" && sleep 3 && sdef /Applications/YourApp.app
```

#### 2. Get the Bundle Identifier

```bash
defaults read /Applications/YourApp.app/Contents/Info.plist CFBundleIdentifier
```

#### 3. Study the Scripting Dictionary

Parse the sdef to understand what's available:

```bash
sdef /Applications/YourApp.app | python3 -c "
import xml.etree.ElementTree as ET, sys
root = ET.parse(sys.stdin).getroot()
for suite in root.findall('.//suite'):
    name = suite.get('name')
    classes = suite.findall('.//class')
    commands = suite.findall('command')
    enums = suite.findall('enumeration')
    print(f'Suite: {name} ({len(classes)} classes, {len(commands)} commands, {len(enums)} enums)')
    for cls in classes:
        print(f'  Class: {cls.get(\"name\")} ({len(cls.findall(\"property\"))} properties)')
"
```

Focus on the **domain-specific suites** -- skip "Standard Suite" and "Text Suite" which are generic.

#### 4. Create the Manifest

Create `manifests/{app-name}/app.yaml`. The app name should be lowercase with hyphens (e.g., `omnifocus`, `quicktime-player`, `microsoft-word`).

See [manifests/README.md](manifests/README.md) for the complete schema reference. Use an existing manifest like `manifests/calendar/app.yaml` as a template.

Key things to get right:

- **`app.name`** must use the display name with spaces (e.g., `Microsoft Word`, `QuickTime Player`) -- the generator derives the package directory name from this
- **Property codes** must match the sdef exactly (4-character codes like `pnam`, `ID  `)
- **Property names** should be camelCase (e.g., `startDate`, not `start date`)
- **Access modes** should match the sdef: `r` for read-only, `rw` for read-write
- **Identifiers** -- every resource needs at least one primary identifier (usually the `id` property)
- **Hierarchy** -- model the containment relationships from the sdef's `<element>` declarations
- **Permissions** -- follow the `app:resource:operation` convention

For large apps (100+ classes), focus on the most commonly used resources and commands. A well-modeled subset is better than a broken attempt at completeness.

#### 5. Generate the Packages

```bash
node packages/cli/dist/bin.js generate manifests/{app-name}/app.yaml \
  --out-dir packages --target all
```

This creates two directories:

- `packages/{app-name}/` -- client SDK + CLI plugin
- `packages/{app-name}-server/` -- API plugin + MCP tools

#### 6. Build and Test

```bash
pnpm install
pnpm --filter @macts/{app-name} build
pnpm --filter @macts/{app-name}-server build
```

Fix any TypeScript compilation errors. Common issues:

- **Missing imports** -- the generator may not import enum types used in resource methods
- **Property name clashes** -- if a property name conflicts with a framework class member (e.g., `path` in Clipanion commands), rename the generated property

#### 7. Verify the Generated Code

Spot-check the generated files:

- `packages/{app-name}/src/types.ts` -- type definitions match the manifest
- `packages/{app-name}/src/client.ts` -- client methods exist for all resources
- `packages/{app-name}/src/cli/commands/` -- CLI commands for each operation
- `packages/{app-name}-server/src/mcp/tools/` -- MCP tools for each resource

#### 8. Create a Changeset

```bash
pnpm changeset
```

Include both the client and server packages in the changeset.

#### 9. Submit a Pull Request

- Title: `Add {App Name} support`
- Description: what resources and commands are covered, any limitations or open questions
- Include the manifest, generated packages, and changeset

## Code Style

- TypeScript strict mode
- ESLint with `strict-type-checked` + `stylistic-type-checked` presets
- Prettier for formatting
- No `@ts-ignore` without explanatory comments (prefer `@ts-expect-error`)

## Testing

- Tests use Vitest
- Unit tests go alongside source files (`foo.test.ts` next to `foo.ts`)
- E2E tests use `fixturify-project` for filesystem fixtures
- Always include negative test cases (error paths, invalid inputs)
- See [`.claude/rules/typescript-testing.md`](.claude/rules/typescript-testing.md) for testing conventions

## Questions?

Open an issue for questions about the project, manifest format, or whether a particular app is a good candidate.
