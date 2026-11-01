/**
 * What a macts host on this Mac announces when it starts: which installed
 * apps it serves, which it does not and why, and which executor runs their
 * operations when it is not the native one.
 *
 * Every host prints the same report, so an operator reads `macts --serve`,
 * `macts --mcp`, and `macts mcp serve` the same way. Only the stream differs:
 * a host whose stdout is a protocol channel (`macts --mcp`) prints it to
 * stderr.
 *
 * @packageDocumentation
 */

import type { ResolvedExecutor } from './executor.js'
import type { AppRegistrationReport } from './installed-apps.js'

/** Anything a report line can be written to, such as a command's stdout or stderr. */
export interface ReportStream {
  write(text: string): unknown
}

/**
 * Write the test-executor warning, when a test executor is active.
 *
 * @param out - Where to write; always stderr in practice.
 * @param resolved - The executor the host runs with.
 */
export function writeExecutorWarning(out: ReportStream, resolved: ResolvedExecutor): void {
  if (resolved.warning !== undefined) {
    out.write(`${resolved.warning}\n`)
  }
}

/**
 * Write which installed apps are served, which are not and why, and which
 * are installed without their server package. The executor's provider is
 * written whenever it is not the native one.
 *
 * @param out - Where to write.
 * @param report - What registration produced.
 * @param resolved - The executor the host runs with.
 */
export function writeAppRegistrationReport(
  out: ReportStream,
  report: AppRegistrationReport,
  resolved: ResolvedExecutor
): void {
  if (report.registered.length > 0) {
    out.write(`Serving ${String(report.registered.length)} app(s):\n`)
    for (const { app } of report.registered) {
      out.write(`  ${app}\n`)
    }
  } else if (report.failed.length === 0 && report.missingHost.length === 0) {
    out.write(
      'No apps are installed, so no operations are served. Use `macts mcp install <app>` to add one.\n'
    )
  } else {
    out.write('No apps are served.\n')
  }
  if (report.failed.length > 0) {
    out.write(`Not serving ${String(report.failed.length)} app(s) that failed to register:\n`)
    for (const { app, reason } of report.failed) {
      out.write(`  ${app}: ${reason}\n`)
    }
  }
  if (report.missingHost.length > 0) {
    out.write(
      `Not serving ${String(report.missingHost.length)} app(s) installed without their server package:\n`
    )
    for (const { app, hostPackage, installCommand } of report.missingHost) {
      out.write(`  ${app}: install ${hostPackage} with \`${installCommand}\`\n`)
    }
  }
  if (resolved.kind !== 'native') {
    out.write(`Executor: ${resolved.executor.provider}\n`)
  }
}
