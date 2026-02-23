/**
 * Structured logging with Pino.
 *
 * Provides a singleton logger instance with support for:
 * - Environment-based log levels via LOG_LEVEL
 * - Pretty-printing in development via pino-pretty
 * - JSON output in production
 *
 * @packageDocumentation
 */

import pino from 'pino'

let logger: pino.Logger | null = null

/**
 * Create a new Pino logger instance.
 *
 * In development (NODE_ENV !== 'production'), uses pino-pretty for
 * human-readable output. In production, outputs structured JSON.
 *
 * @param options - Pino logger options to merge with defaults
 * @returns Configured Pino logger
 */
export function createLogger(options?: pino.LoggerOptions): pino.Logger {
  const opts: pino.LoggerOptions = {
    level: process.env['LOG_LEVEL'] ?? 'info',
    ...options,
  }

  // Use pino-pretty in development
  if (process.env['NODE_ENV'] !== 'production') {
    return pino({
      ...opts,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    })
  }

  return pino(opts)
}

/**
 * Get the singleton logger instance.
 *
 * Creates a default logger on first call. Use {@link setLogger} to
 * replace the singleton with a custom instance.
 *
 * @returns The singleton Pino logger
 */
export function getLogger(): pino.Logger {
  if (!logger) {
    logger = createLogger()
  }
  return logger
}

/**
 * Replace the singleton logger instance.
 *
 * @param newLogger - The Pino logger to use as the singleton
 */
export function setLogger(newLogger: pino.Logger): void {
  logger = newLogger
}
