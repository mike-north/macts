/**
 * Platform-neutral contracts shared by macts clients, runtimes, adapters, and
 * generated app packages.
 *
 * This package defines what an operation is, which values cross its boundary
 * and in what wire form, how references and files hydrate, what authority an
 * invocation carries, and which structured errors it can fail with. It depends
 * on nothing Mac-specific, so a remote client on any platform can load it, and
 * it is the single declaration site of every structured error class.
 *
 * Generated app packages import these contracts from here directly. The
 * intended path for application code is a re-export through `@macts/sdk`, as
 * set out in `phases/13-sdk-value-and-execution-contracts.md` (D1).
 *
 * @packageDocumentation
 */

export * from './issues.js'
export * from './call-options.js'
export * from './values/index.js'
export * from './references/index.js'
export * from './files/index.js'
export * from './invocation/index.js'
export * from './errors/index.js'
export * from './operations/index.js'
