/**
 * Table column configuration.
 */
export interface TableColumn {
  /** Column header label */
  readonly header: string

  /** Property key to extract from data objects */
  readonly key: string

  /** Minimum width (default: header length) */
  readonly minWidth?: number

  /** Maximum width (truncate with ...) */
  readonly maxWidth?: number

  /** Alignment (default: 'left') */
  readonly align?: 'left' | 'right' | 'center'
}

/**
 * Options for table formatting.
 */
export interface TableOptions {
  /** Column definitions */
  readonly columns?: readonly TableColumn[]

  /** Whether to show headers (default: true) */
  readonly showHeaders?: boolean

  /** Column separator (default: '  ') */
  readonly separator?: string
}

/**
 * Output formatter interface.
 *
 * Formatters convert data to string output for the CLI.
 */
export interface OutputFormatter {
  /**
   * Format a single data object.
   *
   * @param data - Data to format
   * @returns Formatted string
   */
  format(data: unknown): string

  /**
   * Format a list of objects.
   *
   * @param data - Array of objects to format
   * @param options - Table formatting options
   * @returns Formatted string
   */
  formatList(data: readonly unknown[], options?: TableOptions): string

  /**
   * Format an error message.
   *
   * @param error - Error or message to format
   * @returns Formatted error string
   */
  formatError(error: Error | string): string

  /**
   * Format a success message.
   *
   * @param message - Success message
   * @returns Formatted success string
   */
  formatSuccess(message: string): string
}
