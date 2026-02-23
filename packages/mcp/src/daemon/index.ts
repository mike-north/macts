/**
 * MCP daemon server exports.
 *
 * @packageDocumentation
 */

export { createDaemon } from './server.js'
export type { DaemonOptions, DaemonServer } from './server.js'
export { getSocketPath, getPidFile } from './paths.js'
