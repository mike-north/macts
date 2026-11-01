/**
 * The tools every MCP host the CLI starts serves, and the runtime behind them.
 *
 * Both MCP transports, `macts --mcp` (stdio) and the HTTP daemon
 * (`macts mcp serve`, `macts mcp start`), serve the same tools from the same
 * kind of runtime, built here once per process:
 *
 * - the executor is resolved at startup ({@link resolveExecutor});
 * - the runtime enforces this Mac's governance, `loadHostGovernance`
 *   (phases/13 D5), so policy, approvals, per-key policies, and the audit log
 *   are the ones the HTTP API enforces;
 * - every installed app is registered from its generated contract through the
 *   host registration path ({@link registerInstalledApps});
 * - the operation tools are derived from the registered operations by the
 *   `@macts/mcp` adapter, and the built-in capability-discovery tool is served
 *   beside them as a host tool.
 *
 * Where each call's credential comes from is the transport's decision, not
 * this module's: the stdio host presents the key it was started with, and the
 * daemon presents each request's bearer. Either way the runtime verifies it on
 * every call.
 *
 * @packageDocumentation
 */

import { loadCapabilityRegistry } from '@macts/core'
import {
  createDiscoveryTool,
  createMcpAdapter,
  withHostTools,
  type McpAdapter,
  type McpHostTool,
} from '@macts/mcp'
import { createRuntime, loadHostGovernance } from '@macts/runtime'
import { loadActiveGovernanceFilter } from '../commands/capabilities/policy.js'
import { resolveManifestsDir } from '../commands/capabilities/registry.js'
import { resolveExecutor, type ResolvedExecutor } from './executor.js'
import {
  loadInstalledApps,
  registerInstalledApps,
  type AppRegistrationReport,
  type InstalledAppsOptions,
} from './installed-apps.js'
import { writeAppRegistrationReport, writeExecutorWarning } from './startup-report.js'

/** Configuration for {@link createMcpHost}. */
export interface McpHostOptions {
  /** The process environment; selects the executor. */
  readonly env: Readonly<Record<string, string | undefined>>
  /**
   * Where startup diagnostics are written (stderr in practice): the
   * test-executor warning, the app registration report, and manifest or policy problems of the
   * discovery tool.
   */
  readonly diagnostics: NodeJS.WritableStream
  /** Where installed apps are looked for; defaults to the macts plugins directory. */
  readonly installedApps?: InstalledAppsOptions
}

/** A built MCP host: the tools to serve, and what startup found. */
export interface McpHost {
  /** Every tool to serve: the operation tools and the discovery tool. */
  readonly adapter: McpAdapter
  /** Which installed apps registered, which failed and why. */
  readonly report: AppRegistrationReport
  /** The executor the runtime runs with. */
  readonly executor: ResolvedExecutor
}

/**
 * Build the runtime, register the installed apps, and derive the tools an MCP
 * host serves, writing the startup report to `options.diagnostics`.
 *
 * @param options - The environment, the diagnostics stream, and where to find
 *   installed apps.
 * @returns The tools to serve and what startup found.
 * @throws `UnknownTestExecutorError` when the environment names no built-in
 *   test executor.
 * @throws `McpToolDerivationError` when a registered operation cannot be
 *   served as an MCP tool. The message names the operation.
 */
export async function createMcpHost(options: McpHostOptions): Promise<McpHost> {
  const { diagnostics } = options
  const executor = resolveExecutor(options.env)
  writeExecutorWarning(diagnostics, executor)

  const runtime = createRuntime({ executor: executor.executor, governance: loadHostGovernance })
  const installed = await loadInstalledApps(options.installedApps)
  const report = registerInstalledApps(runtime, installed)
  writeAppRegistrationReport(diagnostics, report, executor)

  const hostTools = await loadDiscoveryHostTools(diagnostics)
  const adapter = withHostTools(createMcpAdapter(runtime), hostTools)
  return { adapter, report, executor }
}

/**
 * The built-in capability-discovery tool, over the registry of the manifests
 * directory, filtered by the active governance policy.
 *
 * @remarks
 * Discovery degrades rather than blocking startup: with no manifests
 * directory it is omitted, and each manifest that fails to load is reported
 * and skipped.
 */
async function loadDiscoveryHostTools(diagnostics: NodeJS.WritableStream): Promise<McpHostTool[]> {
  const manifestsDir = resolveManifestsDir()
  if (manifestsDir === null) {
    diagnostics.write('No manifests directory found; capability-discovery tool disabled.\n')
    return []
  }

  const [{ registry, errors }, governance] = await Promise.all([
    loadCapabilityRegistry(manifestsDir),
    loadActiveGovernanceFilter(diagnostics),
  ])
  for (const error of errors) {
    diagnostics.write(`Manifest load error: ${error.app}: ${error.message}\n`)
  }
  return [createDiscoveryTool({ registry, governance })]
}
