import type { OutputFormatter, TableColumn, TableOptions } from './types.js'
import { isRgb } from './utils.js'

/**
 * Human-readable output formatter.
 *
 * Formats data as text with tables and colored output.
 */
export class HumanFormatter implements OutputFormatter {
  format(data: unknown): string {
    if (data === null || data === undefined) {
      return ''
    }

    if (typeof data === 'string') {
      return data
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return String(data)
    }

    if (typeof data === 'bigint') {
      return data.toString()
    }

    if (typeof data === 'symbol') {
      return data.toString()
    }

    if (typeof data === 'function') {
      return '[function]'
    }

    // Unknown primitive type - shouldn't happen but handle gracefully
    if (typeof data !== 'object') {
      return '[unknown]'
    }

    // Format object as key-value pairs
    const obj = data as Record<string, unknown>
    const lines: string[] = []

    for (const [key, value] of Object.entries(obj)) {
      lines.push(`${key}: ${formatValue(value)}`)
    }

    return lines.join('\n')
  }

  formatList(data: readonly unknown[], options?: TableOptions): string {
    if (data.length === 0) {
      return 'No items found.'
    }

    // Derive columns from first item if not provided
    const columns = options?.columns ?? deriveColumns(data[0])
    const showHeaders = options?.showHeaders ?? true
    const separator = options?.separator ?? '  '

    // Calculate column widths
    const widths = calculateWidths(data, columns)

    // Build output lines
    const lines: string[] = []

    // Header row
    if (showHeaders) {
      const headerCells = columns.map((col, i) => {
        const width = widths[i] ?? col.header.length
        return padCell(col.header, width, col.align ?? 'left')
      })
      lines.push(headerCells.join(separator))
    }

    // Data rows
    for (const item of data) {
      const cells = columns.map((col, i) => {
        const width = widths[i] ?? col.header.length
        const value = getNestedValue(item, col.key)
        const text = formatValue(value)
        return padCell(truncate(text, col.maxWidth ?? width), width, col.align ?? 'left')
      })
      lines.push(cells.join(separator))
    }

    return lines.join('\n')
  }

  formatError(error: Error | string): string {
    const message = error instanceof Error ? error.message : error
    return `Error: ${message}`
  }

  formatSuccess(message: string): string {
    return message
  }
}

/**
 * Derive columns from a sample object.
 */
function deriveColumns(sample: unknown): TableColumn[] {
  if (!sample || typeof sample !== 'object') {
    return [{ header: 'Value', key: '' }]
  }

  const obj = sample as Record<string, unknown>
  return Object.keys(obj).map((key) => ({
    header: key,
    key,
  }))
}

/**
 * Calculate column widths based on data.
 */
function calculateWidths(data: readonly unknown[], columns: readonly TableColumn[]): number[] {
  return columns.map((col) => {
    // Start with header width
    let maxWidth = col.header.length

    // Consider min/max width constraints
    if (col.minWidth !== undefined) {
      maxWidth = Math.max(maxWidth, col.minWidth)
    }

    // Check all data values
    for (const item of data) {
      const value = getNestedValue(item, col.key)
      const text = formatValue(value)
      maxWidth = Math.max(maxWidth, text.length)
    }

    // Apply max width constraint
    if (col.maxWidth !== undefined) {
      maxWidth = Math.min(maxWidth, col.maxWidth)
    }

    return maxWidth
  })
}

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: unknown, key: string): unknown {
  if (!key) return obj

  const parts = key.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no'
  }

  if (value instanceof Date) {
    return value.toLocaleString()
  }

  if (Array.isArray(value)) {
    return `[${String(value.length)} items]`
  }

  if (isRgb(value)) {
    return `rgb(${String(value.r)}, ${String(value.g)}, ${String(value.b)})`
  }

  if (typeof value === 'object') {
    // Safe to stringify since we checked for null, Date, Array, and RGB above
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (typeof value === 'symbol') {
    return value.toString()
  }

  if (typeof value === 'function') {
    return '[function]'
  }

  // Unknown type - shouldn't happen but handle gracefully
  return '[unknown]'
}

/**
 * Pad a cell to a given width.
 */
function padCell(text: string, width: number, align: 'left' | 'right' | 'center'): string {
  if (text.length >= width) return text

  const padding = width - text.length

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + text
    case 'center': {
      const left = Math.floor(padding / 2)
      const right = padding - left
      return ' '.repeat(left) + text + ' '.repeat(right)
    }
    case 'left':
    default:
      return text + ' '.repeat(padding)
  }
}

/**
 * Truncate text to a maximum length.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
