# Releasing

This document describes how `@macts/*` packages get published to npm, and how to
recover manually if the automated flow needs help.

## How releases work

1. Contributors add a changeset for any change that affects published packages:

   ```bash
   pnpm changeset
   ```

   Changesets are committed alongside the code that motivated them.

2. On every push to `main`, the `Release` workflow
   (`.github/workflows/release.yml`) runs `changesets/action`, which maintains
   an open "Version Packages" pull request. That PR accumulates all pending
   changesets and shows the version bumps and changelog entries that will
   result from merging it.

   > **Note:** GitHub suppresses workflow triggers for pull requests created
   > with the default `GITHUB_TOKEN`, so CI does not run automatically on the
   > "Version Packages" PR. Close and reopen the PR to trigger CI (including
   > the `generate:check` gate) before merging. To make this automatic,
   > pass a fine-grained personal access token (contents + pull-requests
   > read/write) as the `GITHUB_TOKEN` env of the `changesets/action` step in
   > `release.yml` instead of the default token.

3. Merging the "Version Packages" PR triggers the same workflow to publish:
   every `@macts/*` package is built and published to npm using
   [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC)
   — no long-lived npm tokens are stored in this repository — and each publish
   includes [provenance](https://docs.npmjs.com/generating-provenance-statements).

## Fixed versioning

All `@macts/*` packages share a single version number. Every release
republishes **all** packages at that version (even ones with no changes) and
creates one git tag per package (via `changeset tag`).

## Staying pre-1.0

macts is deliberately on a `0.x` line. `0.x` is semver's signal that the public
API is still moving, and it is the honest posture until the SDK surface settles.
CI enforces it: the `Release plan stays below 1.0` step runs
`pnpm release:plan-check`, which computes the pending release plan and fails if
any package would land at `1.0.0` or above.

### The peerDependencies rule

**A major bump can appear without anyone writing a `major` changeset.** This is
the single most likely cause of a surprise version, so it is worth understanding
exactly. Changesets' rule (`shouldBumpMajor`) is:

> A package that _peer-depends_ on a package receiving a **minor or major** bump
> is itself majored. By default the declared range is **not consulted at all** —
> a maximally wide `"*"` peer is majored just the same as a narrow one. Only with
> `onlyUpdatePeerDependentsWhenOutOfRange: true` does the range matter, and then
> the dependent is majored **iff the new version leaves the declared range**.

`.changeset/config.json` opts into that flag, so the range now governs. Because
every `@macts/*` package is in one `fixed` group, a single major anywhere spreads
to all of them — which is how one peer edge produced a workspace-wide `1.0.0`.

That leaves one standing invariant:

> **Never narrow a `peerDependencies` range on a `@macts/*` sibling.**

Any change that shrinks the supported range means the next release's version
falls outside it, which Changesets reads as a breaking change and majors. The
app packages declare `"@macts/cli": "*"`, which nothing can ever fall outside;
tightening it to something like `"^0.2.0"` would major the workspace on the very
next minor. Since all `@macts/*` packages are released in lockstep at an
identical version, a narrow range buys no real protection anyway.

The degenerate case of the same rule: **a peer range must be a valid published
semver range.** `workspace:*` is not one, so `semverSatisfies` is false for
_every_ version — effectively an infinitely narrow range that always reads as
"left the range." Use `dependencies` or `devDependencies` for workspace-internal
links; see "Type-only dependencies" below.

If a version bump ever looks wrong, `pnpm exec changeset status --verbose`
shows which changesets drive each package, and `pnpm release:plan-check` names
the offending packages.

### Type-only dependencies

Types alone never justify a peer dependency. `@macts/types` exists for exactly
this: it holds the shared MCP plugin type definitions and emits no runtime code,
so generated `@macts/<app>-server` packages can describe an MCP plugin through
an ordinary `dependencies` entry instead of peer-depending on the `@macts/mcp`
server implementation. `@macts/mcp` re-exports those types, so importing them
from `@macts/mcp` still works.

### Cutting a real 1.0

When the API is genuinely stable and the decision is deliberate:

1. Add a `major` changeset.
2. Set `ALLOW_MAJOR_RELEASE=1` on the CI job (and locally) to bypass the guard.
3. Consider removing the guard entirely once past 1.0 — it exists to protect a
   pre-1.0 project from an accidental stability promise, not to block real
   majors forever.

## Generator contract

Generated packages' `package.json` files are owned by the code generator, not
by hand edits. Versions flow from `packages/core/package.json` through
`scripts/regenerate.mjs` into every generated package. **Never hand-edit a
generated package's `package.json`** — run the generator instead
(`pnpm generate`), or the next `generate:check` run (and CI) will flag the
drift.

## One-time bootstrap runbook

Trusted publishing requires a publisher to already exist on npm before CI can
use it, so the very first release needs a manual bootstrap:

1. Create (or confirm ownership of) the `macts` org on
   [npmjs.com](https://www.npmjs.com/).
2. Merge the first "Version Packages" PR. CI's publish step will fail
   harmlessly at this point — no trusted publishers are configured yet, so
   `pnpm publish -r` has nothing valid to authenticate with.
3. Locally, on the versioned commit on `main`:

   ```bash
   npm login
   pnpm build && pnpm publish -r --access public --no-git-checks && pnpm changeset tag && git push --follow-tags
   ```

4. Bulk-configure trusted publishers (requires npm CLI >= 11.10, and 2FA
   enabled on your npm account — granular access tokens with 2FA bypass are
   not accepted by the trust endpoints):

   ```bash
   for pkg in packages/*/package.json; do
     name=$(node -p "require('./$pkg').name")
     npm trust github "$name" --repo mike-north/macts --file release.yml --allow-publish --yes
   done
   ```

   Verify with `npm trust list <pkg-name>` or by spot-checking a package's
   settings page on npmjs.com.

5. Merge a trivial changeset to confirm CI can publish via OIDC end-to-end —
   check that the resulting npm versions show provenance badges.
6. Optionally, once confident, enable "require trusted publishing" for the
   `macts` org/packages to disable token-based publishes entirely.

## Adding a new package later

A package that has never been published has no trusted publisher yet, so CI
cannot publish it on the first attempt. Before merging the release PR that
introduces it:

1. Bootstrap-publish it locally once:

   ```bash
   pnpm publish --filter <pkg>... --access public --no-git-checks
   ```

2. Give it a trusted publisher:

   ```bash
   npm trust github <pkg-name> --repo mike-north/macts --file release.yml --allow-publish --yes
   ```

After that, CI can publish it like every other package.

## Manual recovery

If the automated publish step fails or needs to be re-run, the same commands
from the bootstrap runbook work at any time:

```bash
npm login
pnpm build && pnpm publish -r --access public --no-git-checks && pnpm changeset tag && git push --follow-tags
```

`pnpm publish -r` safely skips any package whose current version is already
published, so it's safe to re-run.

## Token fallback if OIDC fails

If trusted publishing is unavailable or broken, publishing can fall back to a
classic npm token:

1. Create a granular automation token on npmjs.com scoped to the `@macts` org.
2. Add it to this repository as the `NPM_TOKEN` secret.
3. Add a `registry-url` to the `actions/setup-node` step in
   `.github/workflows/release.yml` and set `NODE_AUTH_TOKEN` on the publish
   step:

   ```yaml
   - name: Setup Node.js
     uses: actions/setup-node@v4
     with:
       node-version: 24
       cache: pnpm
       registry-url: https://registry.npmjs.org

   - name: Create release PR or publish
     uses: changesets/action@v1
     with:
       version: pnpm changeset version
       publish: pnpm ci:publish
     env:
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

A configured npm auth token takes precedence over OIDC, so remove `NPM_TOKEN`
and the `NODE_AUTH_TOKEN` wiring again once trusted publishing is confirmed
working.

## Requirements

- The publish job runs on `ubuntu-latest` — the build is pure TypeScript, so
  no macOS-specific tooling is needed to publish (macOS is only required to
  regenerate manifests from live app scripting dictionaries).
- OIDC trusted publishing requires the `id-token: write` permission on the job
  and no `.npmrc`/environment auth tokens configured — an auth token present
  anywhere in the environment disables OIDC.
