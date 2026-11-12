/** The background MCP server's persistent diagnostic destination. */
import { getMactsHome } from '@macts/runtime'
import { join } from 'node:path'

/** Resolve the log alongside the daemon's other state under the current macts home. */
export function getMcpLogPath(): string {
  return join(getMactsHome(), 'mcp.log')
}
