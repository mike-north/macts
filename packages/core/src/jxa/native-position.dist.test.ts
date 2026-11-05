/**
 * Built-module tests for the position reader a native script hands the codec
 * (`positionOf`), as the package's build output composes it, in the real
 * automation process on macOS.
 *
 * The reader embeds `specifierPosition` via `Function.prototype.toString()`,
 * and the bridge's display form of a specifier is the bridge's own, so only
 * the shipped script, run by the real host, shows that the two agree. The
 * expected values are written by hand from the reader's rule (phases/13 D9):
 * a specifier whose final step is `.at(N)` gives the zero-based `N`, whatever
 * steps come before it, and any other specifier gives none.
 *
 * Finder's specifiers are built without sending it an event, so no
 * automation permission is needed. The build output must exist; a missing
 * `dist` fails the suite with an instruction to build.
 *
 * @see ./native-position.ts
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D9)
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIST_ENTRY = fileURLToPath(new URL('../../dist/index.js', import.meta.url))

/** Runs `body` as a native script against Finder with the built package, and returns its outcome. */
function runWithDist(body: string): unknown {
  if (!existsSync(DIST_ENTRY)) {
    throw new Error(
      `The built package is missing (${DIST_ENTRY}). Run \`pnpm --filter @macts/core build\` before this test.`
    )
  }
  const script = {
    bundleId: 'com.apple.finder',
    body,
    input: {},
    inputPlan: { kind: 'record', fields: {} },
    outputPlan: { kind: 'array', items: { kind: 'string' } },
    references: {},
  }
  const program = [
    `import { NATIVE_CODEC, runNativeScript } from ${JSON.stringify(pathToFileURL(DIST_ENTRY).href)};`,
    `const outcome = await runNativeScript(${JSON.stringify(script)}, NATIVE_CODEC, { timeout: 30000 });`,
    'process.stdout.write(JSON.stringify(outcome));',
  ].join('\n')
  const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', program], {
    encoding: 'utf8',
  })
  return JSON.parse(stdout)
}

describe.skipIf(process.platform !== 'darwin')('the built position reader', () => {
  it('reads the final .<collection>.at(N) of a real specifier, and nothing from any other', () => {
    const outcome = runWithDist(
      [
        'var checks = [',
        '  [app.disks.at(0).items.at(3), "items"],',
        '  [app.disks.at(0).items.at(3), "windows"],',
        '  [app.windows.at(2), "windows"],',
        '  [app.windows.byId(7), "windows"],',
        '  [app.windows.byName("Home"), "windows"],',
        '  [app.windows.at(0).name, "windows"],',
        '];',
        'return checks.map(function (c) { return String(__mactsPositionOf(c[0], c[1])); });',
      ].join('\n')
    )

    // Only a position within a collection of a container counts: the second
    // names another collection, and the third is the application's own.
    expect(outcome).toEqual({
      ok: true,
      value: ['3', 'undefined', 'undefined', 'undefined', 'undefined', 'undefined'],
    })
  }, 30000)
})
