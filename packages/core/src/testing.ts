/**
 * Test support for the macOS provider: internal, not for application use.
 *
 * `@macts/core/testing` exposes the pieces a test needs to run a native script
 * somewhere other than the automation host, for example in an isolated
 * JavaScript context against a stand-in application: the composition of the
 * script the built-in transport runs, the reading of the outcome it prints,
 * a transport that runs that script against a stand-in application, a
 * stand-in Chromium browser application, the record keys the native get and
 * list bodies read for a resource, and the Archive stand-in manifest that
 * exercises key targeting, singleton roots and reported absences.
 * Tests in other macts packages use it to drive the real native executor end
 * to end with only the transport replaced.
 *
 * It is not part of the public API. It is not covered by semantic
 * versioning: any release may change or remove it. Applications and custom
 * transports must not depend on it; the public transport seam is
 * `NativeTransport` with `runNativeScript`.
 *
 * @packageDocumentation
 */

export { composeNativeScript, parseNativeOutcome } from './jxa/executor.js'
export { standInTransport } from './jxa/test-support/stand-in-app.js'
export {
  standInChromium,
  STAND_IN_NEW_TAB_ID,
  type StandInChromiumOptions,
  type StandInTab,
  type StandInWindow,
} from './jxa/test-support/stand-in-chromium.js'
export { nativeReadKeys, type NativeReadKeys } from './jxa/native-scripts.js'
export { archiveManifest } from './manifest/test-support/archive-key-and-root.js'
