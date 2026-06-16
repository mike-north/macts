#!/usr/bin/env node
/**
 * `macts-bench` — run the efficiency benchmark and emit the report.
 *
 * Usage:
 *   macts-bench [--out <dir>] [--max-retries <n>]
 *
 * By default this constructs the real runners WITHOUT live dependencies, so in
 * any non-live environment (including CI or a dev box without the macts server)
 * every task is recorded as a clean failure citing the missing live environment.
 * That produces an honest "awaiting a live run" report rather than fabricated
 * numbers. To produce real numbers, wire the live runners (see the README) and
 * pass them to {@link runBenchmark}.
 *
 * @packageDocumentation
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runBenchmark } from '../harness.js'
import { renderMarkdown } from '../report.js'
import { DEFAULT_TASKS } from '../tasks/registry.js'
import { MactsRunner } from '../runners/macts.js'
import { RawComputerUseRunner } from '../runners/raw-computer-use.js'
import type { Runner } from '../types.js'

interface CliArgs {
  readonly outDir: string
  readonly maxRetries: number | undefined
}

/** Parse the small, fixed CLI surface. Throws on an unknown or malformed flag. */
function parseArgs(argv: readonly string[]): CliArgs {
  let outDir = resolve(process.cwd(), 'benchmark-results')
  let maxRetries: number | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--out') {
      const value = argv[++i]
      if (value === undefined) throw new Error('--out requires a directory path')
      outDir = resolve(process.cwd(), value)
    } else if (arg === '--max-retries') {
      const value = argv[++i]
      const parsed = Number(value)
      if (value === undefined || !Number.isInteger(parsed) || parsed < 0) {
        throw new Error('--max-retries requires a non-negative integer')
      }
      maxRetries = parsed
    } else {
      throw new Error(`Unknown argument: ${String(arg)}`)
    }
  }

  return { outDir, maxRetries }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  // Real runners with no live deps: in a non-live environment each run is
  // recorded as a failure citing the missing environment. No faked numbers.
  const runners: Runner[] = [new RawComputerUseRunner(), new MactsRunner()]

  const report = await runBenchmark(runners, DEFAULT_TASKS, {
    ...(args.maxRetries !== undefined ? { maxRetries: args.maxRetries } : {}),
  })

  await mkdir(args.outDir, { recursive: true })
  const jsonPath = resolve(args.outDir, 'report.json')
  const mdPath = resolve(args.outDir, 'report.md')
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(mdPath, renderMarkdown(report), 'utf8')

  process.stdout.write(`Benchmark report written:\n  ${jsonPath}\n  ${mdPath}\n`)

  const live = report.results.some((r) => r.metrics.success)
  if (!live) {
    process.stdout.write(
      '\nNote: no live environment detected — all runs recorded as failures awaiting a live Mac.\n' +
        'See benchmarks/efficiency/README.md for the live-run procedure.\n'
    )
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`macts-bench failed: ${message}\n`)
  process.exitCode = 1
})
