import { Command, Option } from 'clipanion'
import { startStdioServer } from '@macts/mcp'
import { createMultiServer, DEFAULT_PORT } from '@macts/api/server'
import { createBearerCredential, createLogger, setLogger } from '@macts/runtime'
import { resolveExecutor } from '../host/executor.js'
import {
  loadInstalledApps,
  registerInstalledApps,
  type AppRegistrationReport,
} from '../host/installed-apps.js'
import { createMcpHost } from '../host/mcp-host.js'
import { writeAppRegistrationReport, writeExecutorWarning } from '../host/startup-report.js'
import { warnIfRemovedTrustSwitchSet } from '../removed-options.js'

/** The environment variable holding the API key `macts --mcp` presents on every call. */
export const MCP_API_KEY_ENV = 'MACTS_API_KEY'

/**
 * Why `macts --mcp` refuses to start without a key, and how to get one.
 *
 * @remarks
 * Fixed text: it never echoes anything from the environment.
 */
export const MISSING_MCP_API_KEY_MESSAGE = [
  `${MCP_API_KEY_ENV} is not set. Every MCP tool call is verified by this key.`,
  'Create a local key with:',
  '  macts api-key create --name <name> --permission <app:resource:operation>',
  `Then set it as ${MCP_API_KEY_ENV} in the environment the MCP client starts \`macts --mcp\` with.`,
].join('\n')

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
      macts provides command-line access to macOS application automation. Use
      subcommands to interact with specific applications, for example
      'macts calendar calendars list'.

      Special modes:

      - --mcp starts an MCP server on stdio (for AI assistants)
      - --serve starts an HTTP server for remote access to installed apps

      Both serve every app whose server package is installed in
      ~/.macts/plugins/, and report at startup, on stderr for --mcp, any app
      they cannot serve. Install an app's server package with
      'macts mcp install calendar'.

      In --mcp mode, macts serves each installed app's operations as MCP
      tools, plus a built-in capability-discovery tool. Every tool call is verified by the
      API key in MACTS_API_KEY, with the same permissions and governance
      policy as the HTTP API. Create a key with
      'macts api-key create --name <name> --permission <app:resource:operation>'.

      To serve MCP over HTTP instead, use 'macts mcp serve' or
      'macts mcp start'; each request then presents its own key as a Bearer
      token.
    `,
    examples: [
      ['List available commands', '$0 --help'],
      ['Start MCP server on stdio', 'MACTS_API_KEY=macts_sk_... $0 --mcp'],
      ['Install an app server package', '$0 mcp install calendar'],
      ['Start HTTP server on port 8080', '$0 --serve --port 8080'],
    ],
  })

  mcp = Option.Boolean('--mcp', {
    description: 'Start an MCP (Model Context Protocol) server on stdio',
  })

  serve = Option.Boolean('--serve', {
    description: 'Start HTTP server for remote access to installed apps',
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

  /**
   * Serve every installed app's operations, and the discovery tool, as MCP
   * tools over stdio.
   *
   * @remarks
   * Every call runs through the runtime under the key in `MACTS_API_KEY`,
   * which is verified on every call, so a key revoked during the session is
   * refused on its next call. Stdout is the MCP channel: every diagnostic,
   * and every runtime log line, goes to stderr.
   */
  private async runMcpServer(): Promise<number> {
    const stderr = this.context.stderr
    // Anything logged on stdout would corrupt the protocol stream.
    setLogger(createLogger({}, 'stderr'))
    warnIfRemovedTrustSwitchSet(process.env, stderr)

    const apiKey = process.env[MCP_API_KEY_ENV]
    if (apiKey === undefined || apiKey.trim() === '') {
      stderr.write(`Failed to start MCP server: ${MISSING_MCP_API_KEY_MESSAGE}\n`)
      return 1
    }
    const credential = createBearerCredential(apiKey)

    try {
      const host = await createMcpHost({ env: process.env, diagnostics: stderr })
      await startStdioServer({ adapter: host.adapter, credential })
      stderr.write(
        `MCP server running on stdio with ${String(host.adapter.listTools().length)} tool(s)\n`
      )
      // The process now runs until the client closes stdin.
      return 0
    } catch (error) {
      // Startup failures carry an actionable message and no stack trace an
      // operator needs, so print only the message.
      const message = error instanceof Error ? error.message : String(error)
      stderr.write(`Failed to start MCP server: ${message}\n`)
      return 1
    }
  }

  private async runHttpServer(): Promise<number> {
    const port = this.port ? parseInt(this.port, 10) : DEFAULT_PORT

    try {
      const resolved = resolveExecutor(process.env)
      const { executor } = resolved
      writeExecutorWarning(this.context.stderr, resolved)

      // Load first (asynchronous), then register on the server's runtime while
      // it is constructed, so every registered app is routed.
      const installed = await loadInstalledApps()
      let report: AppRegistrationReport = { registered: [], failed: [], missingHost: [] }

      // Build TLS config if cert and key are provided
      const tls = this.tlsCert && this.tlsKey ? { cert: this.tlsCert, key: this.tlsKey } : undefined

      // Create and start the server
      const server = createMultiServer([], {
        port,
        host: 'localhost',
        logging: true,
        executor,
        register: (registrar) => {
          report = registerInstalledApps(registrar, installed)
        },
        ...(tls && { tls }),
      })

      writeAppRegistrationReport(this.context.stdout, report, resolved)

      await server.start()

      const url = server.url ?? `http://localhost:${String(port)}`
      this.context.stdout.write(`\nmacts API server running at ${url}\n`)
      this.context.stdout.write(`\nAvailable endpoints:\n`)
      this.context.stdout.write(`  GET  ${url}/health\n`)
      this.context.stdout.write(`  GET  ${url}/api/v1\n`)
      if (report.registered.length > 0) {
        this.context.stdout.write(`  POST ${url}/api/v1/rpc/{app}.{resource}.{operation}\n`)
      }
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
