/**
 * Output formatting utilities for CLI commands.
 *
 * This module provides a consistent interface for formatting CLI output in both
 * human-readable and machine-readable (JSON) formats. All CLI commands should
 * use these formatters to ensure consistent output styling.
 *
 * ## Features
 *
 * - **Dual-mode output**: Switch between human-readable tables and JSON
 * - **Color-coded messages**: Success (green) and error (red) formatting
 * - **Table rendering**: Format lists of objects as aligned tables
 * - **Consistent interface**: Single API works for both output modes
 *
 * ## Usage in Commands
 *
 * Commands should accept a `--json` flag and use `createFormatter()` to get
 * the appropriate formatter instance:
 *
 * @example
 * ```typescript
 * import { Command, Option } from 'clipanion';
 * import { createFormatter } from '@macts/cli';
 *
 * class MyCommand extends Command {
 *   json = Option.Boolean('--json', { description: 'Output as JSON' });
 *
 *   async execute(): Promise<number> {
 *     const formatter = createFormatter(this.json ?? false);
 *
 *     // Format success/error messages
 *     this.context.stdout.write(formatter.formatSuccess('Done!') + '\n');
 *     this.context.stderr.write(formatter.formatError('Failed') + '\n');
 *
 *     // Format structured data
 *     const data = { id: '123', name: 'Example' };
 *     this.context.stdout.write(formatter.format(data) + '\n');
 *
 *     // Format tables
 *     const items = [
 *       { id: '1', name: 'Alice', age: 30 },
 *       { id: '2', name: 'Bob', age: 25 },
 *     ];
 *     this.context.stdout.write(formatter.formatList(items, {
 *       columns: [
 *         { header: 'ID', key: 'id', maxWidth: 5 },
 *         { header: 'Name', key: 'name', maxWidth: 20 },
 *         { header: 'Age', key: 'age', align: 'right' },
 *       ],
 *     }) + '\n');
 *
 *     return 0;
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Output formatter interface.
 *
 * Formatters convert data structures to string output for CLI commands.
 * Use `createFormatter()` to get an instance.
 */
export type { OutputFormatter, TableColumn, TableOptions } from './types.js'

/**
 * JSON output formatter.
 *
 * Formats all output as JSON. Success and error messages are wrapped in
 * objects with appropriate fields.
 *
 * @example
 * ```typescript
 * const formatter = new JsonFormatter();
 * console.log(formatter.format({ status: 'ok', data: [1, 2, 3] }));
 * // Output: {"status":"ok","data":[1,2,3]}
 *
 * console.log(formatter.formatSuccess('Done'));
 * // Output: {"success":true,"message":"Done"}
 *
 * console.log(formatter.formatError('Failed'));
 * // Output: {"error":"Failed"}
 * ```
 */
export { JsonFormatter } from './json.js'

/**
 * Human-readable output formatter.
 *
 * Formats output as plain text with color coding and table alignment.
 * Lists are rendered as aligned tables with headers.
 *
 * @example
 * ```typescript
 * const formatter = new HumanFormatter();
 *
 * // Success message (green checkmark)
 * console.log(formatter.formatSuccess('Operation completed'));
 * // Output: "✓ Operation completed"
 *
 * // Error message (red X)
 * console.error(formatter.formatError('Something failed'));
 * // Output: "✗ Something failed"
 *
 * // Formatted table
 * const items = [
 *   { id: '1', name: 'Alice' },
 *   { id: '2', name: 'Bob' },
 * ];
 * console.log(formatter.formatList(items, {
 *   columns: [
 *     { header: 'ID', key: 'id' },
 *     { header: 'Name', key: 'name' },
 *   ],
 * }));
 * // Output:
 * // ID  Name
 * // 1   Alice
 * // 2   Bob
 * ```
 */
export { HumanFormatter } from './human.js'

import type { OutputFormatter } from './types.js'
import { JsonFormatter } from './json.js'
import { HumanFormatter } from './human.js'

/**
 * Create a formatter based on output mode.
 *
 * This is the recommended way to create formatters in CLI commands.
 * It returns the appropriate formatter implementation based on whether
 * JSON output is requested.
 *
 * @param json - Whether to use JSON output (typically from a --json flag)
 * @returns JsonFormatter if json is true, HumanFormatter otherwise
 *
 * @example
 * ```typescript
 * // In a command
 * const formatter = createFormatter(this.json ?? false);
 *
 * // Format output
 * this.context.stdout.write(formatter.format({ status: 'ok' }) + '\n');
 * ```
 */
export function createFormatter(json: boolean): OutputFormatter {
  if (json) {
    return new JsonFormatter()
  }
  return new HumanFormatter()
}
