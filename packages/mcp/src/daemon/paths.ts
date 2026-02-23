/**
 * Daemon-specific path utilities.
 *
 * @packageDocumentation
 */

import { join } from 'node:path'
import { getMactsHome } from '../plugin/paths.js'

/**
 * Get the Unix socket path for the daemon.
 *
 * @returns Path to the Unix socket file
 */
export function getSocketPath(): string {
  return join(getMactsHome(), 'mcp.sock')
}

/**
 * Get the PID file path for the daemon.
 *
 * Used for daemon management and preventing multiple instances.
 *
 * @returns Path to the PID file
 */
export function getPidFile(): string {
  return join(getMactsHome(), 'mcp.pid')
}
