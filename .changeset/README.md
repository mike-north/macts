# Changesets

This directory contains changeset files that describe changes to packages in the monorepo.

## How to use

When you make a change to a package, run:

```bash
pnpm changeset
```

This will prompt you to describe your changes and which packages they affect.

## Release process

1. Make changes to packages
2. Run `pnpm changeset` to create a changeset file
3. Commit the changeset file with your changes
4. When ready to release, run `pnpm version` to bump versions
5. Run `pnpm release` to publish packages

## Configuration

The configuration for changesets is in `.changeset/config.json`.

All `@macts/*` packages are linked and version together (fixed versioning).
