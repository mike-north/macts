# Phase 0: Project Foundation

## Goal

Establish the monorepo infrastructure, shared tooling, and package scaffolding that all subsequent phases build upon.

## Key Deliverables

1. **Monorepo Configuration**
   - pnpm workspace with `packages/*` structure
   - Shared TypeScript configuration (base tsconfig)
   - Shared ESLint configuration (strict-type-checked + stylistic)
   - Prettier configuration
   - Changesets for versioning

2. **Package Scaffolding**
   - `@macts/core` - empty package with build setup
   - `@macts/cli` - empty package with build setup
   - `@macts/mcp` - empty package with build setup
   - `@macts/api` - empty package with build setup

3. **Build Infrastructure**
   - Nx for task orchestration (build, test, lint)
   - tsup or unbuild for package bundling
   - Vitest for testing
   - API Extractor for .d.ts rollups

4. **CI/CD Foundation**
   - GitHub Actions workflow for build/lint/test
   - Changeset publishing workflow
   - Branch protection rules

## Dependencies

None - this is the foundation phase.

## Critical Files

```
packages/
├── core/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts
├── cli/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts
├── mcp/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts
└── api/
    ├── package.json
    ├── tsconfig.json
    └── src/index.ts

tsconfig.base.json
eslint.config.js
prettier.config.js
nx.json
.changeset/config.json
.github/workflows/ci.yml
```

## Success Criteria

- [ ] `pnpm install` succeeds
- [ ] `pnpm build` builds all packages
- [ ] `pnpm lint` passes on all packages
- [ ] `pnpm test` runs (even if no tests yet)
- [ ] Changesets configured and ready for versioning
- [ ] CI workflow passes on main branch
