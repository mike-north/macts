import type { OutputFormatter, TableOptions } from './types.js'
import { isRgb } from './utils.js'

/**
 * JSON output formatter.
 *
 * Formats data as JSON for machine-readable output.
 */
export class JsonFormatter implements OutputFormatter {
  private readonly prettyPrint: boolean

  constructor(options: { prettyPrint?: boolean } = {}) {
    this.prettyPrint = options.prettyPrint ?? true
  }

  format(data: unknown): string {
    return this.stringify({ data })
  }

  formatList(data: readonly unknown[], _options?: TableOptions): string {
    return this.stringify({ data })
  }

  formatError(error: Error | string): string {
    const message = error instanceof Error ? error.message : error

    if (error instanceof Error && error.stack) {
      return this.stringify({ error: { message, stack: error.stack } })
    }

    return this.stringify({ error: { message } })
  }

  formatSuccess(message: string): string {
    return this.stringify({ success: true, message })
  }

  private stringify(data: unknown): string {
    if (this.prettyPrint) {
      return JSON.stringify(data, this.replacer, 2)
    }
    return JSON.stringify(data, this.replacer)
  }

  /**
   * JSON replacer that handles special types.
   */
  private replacer = (_key: string, value: unknown): unknown => {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString()
    }

    // Handle RGB objects for display
    if (isRgb(value)) {
      return { r: value.r, g: value.g, b: value.b }
    }

    return value
  }
}
