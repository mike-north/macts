/**
 * SQLite access for the runtime's persistent stores: the API-key store and the
 * transfer store.
 *
 * Both stores run on Node's built-in `node:sqlite`, so no native addon is ever
 * built or downloaded when macts is installed (phases/13, D1). This module is
 * the single place that module is referenced or loaded: the stores obtain the
 * module through {@link loadSqlite} and name its types through the aliases
 * below, and they share the one transaction primitive, {@link runInTransaction}.
 *
 * ## Why loading is centralized
 *
 * Node 22 and 24 print `ExperimentalWarning: SQLite is an experimental feature`
 * to stderr the first time `node:sqlite` is loaded. That line is noise to
 * anyone using macts — a CLI user, an MCP client reading stderr, an
 * application embedding the SDK — and says nothing about their own code. So
 * {@link loadSqlite} filters exactly that one warning, at the moment of load,
 * and nothing else: every other warning (including other experimental
 * warnings, and anything emitted concurrently) passes through untouched. No
 * process-wide flag or listener removal is used, because those would hide
 * warnings the host application cares about.
 *
 * @packageDocumentation
 */

import type { DatabaseSync, SQLOutputValue } from 'node:sqlite'

/** The shape of the built-in `node:sqlite` module. */
export type SqliteModule = typeof import('node:sqlite')

/** An open, synchronous `node:sqlite` connection. */
export type SqliteDatabase = DatabaseSync

/**
 * One result row as `node:sqlite` returns it: column name to value. The
 * schema, not the type, fixes which columns exist and what they hold, so
 * readers narrow each value before using it.
 */
export type SqliteRow = Record<string, SQLOutputValue>

/** First Node.js release that loads `node:sqlite` without a command-line flag. */
export const MINIMUM_NODE_FOR_SQLITE = '22.13.0'

/** The loaded module, memoized so the warning filter is installed at most once. */
let sqliteModule: SqliteModule | undefined

/**
 * True when a `process.emitWarning` call is the one-time experimental notice
 * Node prints when `node:sqlite` is first loaded.
 *
 * `emitWarning` accepts either a message string or an `Error`, with the
 * warning type given positionally or in an options object. All shapes are
 * recognized, and both conditions must hold — the type is
 * `ExperimentalWarning` *and* the message names SQLite — so no other
 * experimental warning is ever caught.
 */
export function isSqliteExperimentalWarning(warning: unknown, typeOrOptions: unknown): boolean {
  const message = warning instanceof Error ? warning.message : warning
  if (typeof message !== 'string' || !message.includes('SQLite')) {
    return false
  }
  if (warning instanceof Error && warning.name === 'ExperimentalWarning') {
    return true
  }
  if (typeOrOptions === 'ExperimentalWarning') {
    return true
  }
  return (
    typeof typeOrOptions === 'object' &&
    typeOrOptions !== null &&
    'type' in typeOrOptions &&
    typeOrOptions.type === 'ExperimentalWarning'
  )
}

/**
 * Obtain `node:sqlite` from the running Node.js, or `undefined` when this
 * Node.js cannot load it without a flag.
 *
 * `process.getBuiltinModule` returns `undefined` for a built-in that is not
 * available in the current process; the return type here states that, which
 * the typings for a newer Node.js do not.
 */
function getBuiltinSqlite(): SqliteModule | undefined {
  return process.getBuiltinModule('node:sqlite')
}

/**
 * Load the built-in `node:sqlite` module without surfacing its experimental
 * warning.
 *
 * The module is obtained synchronously through `process.getBuiltinModule`
 * while `process.emitWarning` is temporarily wrapped to drop only the SQLite
 * `ExperimentalWarning`. The original `process.emitWarning` is restored before
 * this function returns or throws. The result is memoized.
 *
 * @returns The `node:sqlite` module.
 * @throws Error when the running Node.js cannot load `node:sqlite` without a
 *   flag (older than {@link MINIMUM_NODE_FOR_SQLITE}).
 */
export function loadSqlite(): SqliteModule {
  if (sqliteModule !== undefined) {
    return sqliteModule
  }

  // Captured unbound on purpose: it is restored verbatim (same identity) and
  // re-invoked with its original receiver through Reflect.apply.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalEmitWarning = process.emitWarning
  process.emitWarning = function (this: NodeJS.Process, ...args: unknown[]): void {
    if (isSqliteExperimentalWarning(args[0], args[1])) {
      return
    }
    Reflect.apply(originalEmitWarning, this, args)
  }

  let loaded: SqliteModule | undefined
  try {
    loaded = getBuiltinSqlite()
  } finally {
    process.emitWarning = originalEmitWarning
  }

  if (loaded === undefined) {
    throw new Error(
      `macts requires Node.js ${MINIMUM_NODE_FOR_SQLITE} or later ` +
        `for its built-in SQLite support (running ${process.version}).`
    )
  }
  sqliteModule = loaded
  return loaded
}

/**
 * Run `work` inside a single SQLite transaction on `database`.
 *
 * The transaction commits when `work` returns and rolls back when it throws
 * (or when the commit itself fails), so either every statement in `work`
 * takes effect or none does. The original error is always the one rethrown:
 * if SQLite has already rolled the transaction back on its own (some errors
 * do), the redundant `ROLLBACK` failure is ignored rather than masking the
 * original cause.
 *
 * `work` must be synchronous — a transaction cannot span an `await` — and
 * transactions do not nest.
 *
 * By default the transaction is deferred: it takes the write lock at its
 * first write. A transaction that reads and then writes based on what it read
 * should pass `{ immediate: true }`, which takes the write lock at the start.
 * Another connection that wants to write then waits for it (up to the
 * connection's busy timeout) instead of failing when it tries to upgrade a
 * read it started concurrently.
 *
 * @param database - The open connection to run the transaction on.
 * @param work - The statements to apply atomically.
 * @param options - `immediate` takes the write lock when the transaction begins.
 * @returns Whatever `work` returns.
 */
export function runInTransaction<T>(
  database: SqliteDatabase,
  work: () => T,
  options: { readonly immediate?: boolean } = {}
): T {
  database.exec(options.immediate === true ? 'BEGIN IMMEDIATE' : 'BEGIN')
  try {
    const result = work()
    database.exec('COMMIT')
    return result
  } catch (error) {
    try {
      database.exec('ROLLBACK')
    } catch {
      // SQLite already ended the transaction; the original error is what matters.
    }
    throw error
  }
}
