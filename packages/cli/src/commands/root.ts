import * as path from 'node:path'
import * as fs from 'node:fs'
import { Command, Option } from 'clipanion'
import {
  createMcpServer,
  discoverMcpPlugins,
  createDiscoveryTool,
  type McpPlugin,
} from '@macts/mcp'
import { createServer, DEFAULT_PORT } from '@macts/api/server'
import { loadManifest, loadCapabilityRegistry } from '@macts/core'
import { resolveManifestsDir } from './capabilities/registry.js'
import { getMactsHome } from '../plugin/paths.js'
import { loadActiveGovernanceFilter } from './capabilities/policy.js'

/**
 * Root command that handles global flags like --mcp and --serve.
 *
 * This command runs when no subcommand is specified and handles
 * special modes like MCP server and HTTP serve mode.
 */
export class RootCommand extends Command {
  static override paths = [Command.Default]

  static override usage = Command.Usage({
    description: 'macOS application automation CLI',
    details: `
      macts provides command-line access to macOS application automation.

      Use subcommands to interact with specific applications:
        macts calendar calendars list
        macts calendar events create --summary "Meeting"

      Special modes:
        --mcp      Start as an MCP server (for AI assistants)
        --serve    Start HTTP server for remote access

      MCP Mode:
        The MCP server exposes automation tools for AI assistants via the
        Model Context Protocol. Install an app's MCP server plugin with:
          macts mcp install calendar

        The MCP server discovers plugins from ~/.macts/plugins/ automatically.

        By default, the MCP server requires a valid MACTS_API_KEY environment
        variable at startup. Create one with:
          macts api-key create --name <name> --permission <app:resource:operation>
        Pass --disable-api-key-validation to skip this check (not recommended).
    `,
    examples: [
      ['List available commands', '$0 --help'],
      ['Start MCP server', '$0 --mcp'],
      ['Start MCP server without API key validation', '$0 --mcp --disable-api-key-validation'],
      ['Install an app MCP server plugin', '$0 mcp install calendar'],
      ['Start HTTP server on port 8080', '$0 --serve --port 8080'],
    ],
  })

  mcp = Option.Boolean('--mcp', {
    description: 'Start as an MCP (Model Context Protocol) server',
  })

  disableApiKeyValidation = Option.Boolean('--disable-api-key-validation', false, {
    description: 'Skip MACTS_API_KEY validation at MCP server startup (not recommended)',
  })

  serve = Option.Boolean('--serve', {
    description: 'Start HTTP server for remote access',
  })

  port = Option.String('--port', {
    description: 'Port for HTTP server (requires --serve)',
  })

  tlsCert = Option.String('--tls-cert', {
    description: 'Path to TLS certificate file (enables HTTPS)',
  })

  tlsKey = Option.String('--tls-key', {
    description: 'Path to TLS private key file (requires --tls-cert)',
  })

  async execute(): Promise<number> {
    if (this.mcp) {
      return this.runMcpServer()
    }

    if (this.serve) {
      return this.runHttpServer()
    }

    // No mode specified - show help
    this.context.stdout.write('macts - macOS application automation CLI\n\n')
    this.context.stdout.write('Use --help to see available commands.\n')
    this.context.stdout.write('Use --mcp to start as an MCP server.\n')
    this.context.stdout.write('Use --serve to start an HTTP server.\n')

    return Promise.resolve(0)
  }

  private async runMcpServer(): Promise<number> {
    // Discover MCP plugins from ~/.macts/plugins/
    const { plugins, errors } = await discoverMcpPlugins()

    // Log errors to stderr (stdout is for MCP protocol)
    for (const error of errors) {
      this.context.stderr.write(`Plugin load error: ${error.packageName}: ${error.message}\n`)
    }

    // Build the built-in capability-discovery plugin from the manifests
    // directory, so agents can search/inspect typed capabilities without every
    // app plugin being installed. The discovery tool degrades gracefully: if no
    // manifests directory is found, it is simply omitted.
    const discoveryPlugins = await this.buildDiscoveryPlugins()

    const allPlugins = [...discoveryPlugins, ...plugins]

    // Log plugin count to stderr for debugging
    this.context.stderr.write(`Starting MCP server with ${String(allPlugins.length)} plugin(s)\n`)

    try {
      // Start MCP server on stdio
      // This will run until stdin closes
      await createMcpServer(allPlugins, { disableApiKeyValidation: this.disableApiKeyValidation })
      return 0
    } catch (error) {
      // Startup validation errors (e.g. missing/invalid MACTS_API_KEY) carry
      // an actionable, remediation-bearing message and no useful stack trace
      // for operators, so print only the message, not the stack.
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(`Failed to start MCP server: ${message}\n`)
      return 1
    }
  }

  /**
   * Build the built-in capability-discovery plugin (a single discovery tool)
   * from the auto-detected manifests directory. Returns an empty array when no
   * manifests directory can be located, so the server still starts.
   */
  private async buildDiscoveryPlugins(): Promise<McpPlugin[]> {
    const manifestsDir = resolveManifestsDir()
    if (!manifestsDir) {
      this.context.stderr.write(
        'No manifests directory found; capability-discovery tool disabled.\n'
      )
      return []
    }

    const [{ registry, errors }, governance] = await Promise.all([
      loadCapabilityRegistry(manifestsDir),
      loadActiveGovernanceFilter(this.context.stderr),
    ])
    for (const error of errors) {
      this.context.stderr.write(`Manifest load error: ${error.app}: ${error.message}\n`)
    }

    // Pass the real policy-backed governance filter into the discovery tool
    // so the MCP surface honours the same policy as CLI capabilities search.
    const discoveryTool = createDiscoveryTool({ registry, governance })
    return [
      {
        name: 'capabilities',
        description: 'Built-in macts capability discovery',
        tools: [discoveryTool],
      },
    ]
  }

  private async runHttpServer(): Promise<number> {
    const port = this.port ? parseInt(this.port, 10) : DEFAULT_PORT

    try {
      // Find manifest - look in common locations
      const manifestLocations = [
        // 1. Current working directory
        path.join(process.cwd(), 'manifests/calendar/app.yaml'),
        // 2. User's macts config directory (honors MACTS_HOME, falls back to
        //    os.homedir() — never a cwd-relative path when HOME is unset)
        path.join(getMactsHome(), 'manifests/calendar/app.yaml'),
        // 3. Relative to dist/ (when running built CLI from packages/cli/dist/)
        path.resolve(import.meta.dirname, '../../../manifests/calendar/app.yaml'),
        // 4. Relative to src/ (when running with tsx from packages/cli/src/)
        path.resolve(import.meta.dirname, '../../../../manifests/calendar/app.yaml'),
      ]

      let manifestPath: string | null = null
      for (const loc of manifestLocations) {
        if (fs.existsSync(loc)) {
          manifestPath = loc
          break
        }
      }

      if (!manifestPath) {
        this.context.stderr.write('Could not find manifest. Searched:\n')
        for (const loc of manifestLocations) {
          this.context.stderr.write(`  - ${loc}\n`)
        }
        return 1
      }

      const manifest = await loadManifest(manifestPath)

      this.context.stdout.write(`Loading manifest: ${manifest.app.name}\n`)

      // Build TLS config if cert and key are provided
      const tls = this.tlsCert && this.tlsKey ? { cert: this.tlsCert, key: this.tlsKey } : undefined

      // Create and start the server
      const server = createServer(manifest, {
        port,
        host: 'localhost',
        logging: true,
        ...(tls && { tls }),
      })

      await server.start()

      const url = server.url ?? `http://localhost:${String(port)}`
      this.context.stdout.write(`\nmacts API server running at ${url}\n`)
      this.context.stdout.write(`\nAvailable endpoints:\n`)
      this.context.stdout.write(`  GET  ${url}/health\n`)
      this.context.stdout.write(`  GET  ${url}/api/v1\n`)
      this.context.stdout.write(`  POST ${url}/api/v1/rpc/{app}.{resource}.{operation}\n`)
      this.context.stdout.write(`\nPress Ctrl+C to stop.\n`)

      // Keep the process running until interrupted
      await new Promise<void>((resolve) => {
        process.on('SIGINT', () => {
          this.context.stdout.write('\nShutting down...\n')
          server
            .stop()
            .then(() => {
              resolve()
            })
            .catch(() => {
              resolve()
            })
        })
        process.on('SIGTERM', () => {
          server
            .stop()
            .then(() => {
              resolve()
            })
            .catch(() => {
              resolve()
            })
        })
      })

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(`Failed to start HTTP server: ${message}\n`)
      return 1
    }
  }
}
