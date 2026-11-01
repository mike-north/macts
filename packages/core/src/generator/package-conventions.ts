/**
 * Conventions shared by every generated app package's `package.json`.
 *
 * The client (`@macts/<app>`) and server (`@macts/<app>-server`) packages are
 * installed together with the macts runtime, so they declare the same
 * supported Node.js range. Declaring it once here keeps the two from drifting.
 *
 * @packageDocumentation
 */

/**
 * The `engines.node` range of every generated app package.
 *
 * @remarks
 * 22.13.0 is the earliest 22.x release that loads `node:sqlite` without a
 * flag, which the Mac-side runtime's credential store relies on
 * (`phases/13-sdk-value-and-execution-contracts.md`, D1).
 */
export const GENERATED_PACKAGE_NODE_ENGINE = '>=22.13.0'
