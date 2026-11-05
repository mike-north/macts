/**
 * Test support for the macOS provider: internal, not for application use.
 *
 * `@macts/core/testing` exposes the pieces a test needs to run a native script
 * somewhere other than the automation host, for example in an isolated
 * JavaScript context against a stand-in application: the composition of the
 * script the built-in transport runs, the reading of the outcome it prints,
 * a transport that runs that script against a stand-in application, a
 * stand-in Chromium browser application, the record keys the native get and
 * list bodies read for a resource, the Archive stand-in manifest that
 * exercises key targeting, singleton roots and reported absences, the Panes
 * stand-in manifest whose tabs are positional and a stand-in app of its shape,
 * and the
 * reader of an object's position from its specifier, which a live test runs
 * against a real app to check the display form it parses.
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
export {
  NATIVE_POSITION_FUNCTION,
  NATIVE_POSITION_READER,
  specifierPosition,
} from './jxa/native-position.js'
export { standInTransport, type StandInAutomation } from './jxa/test-support/stand-in-app.js'
export {
  standInChromium,
  STAND_IN_NEW_TAB_ID,
  type StandInChromiumOptions,
  type StandInTab,
  type StandInWindow,
} from './jxa/test-support/stand-in-chromium.js'
export { nativeReadKeys, type NativeReadKeys } from './jxa/native-scripts.js'
export { archiveManifest } from './manifest/test-support/archive-key-and-root.js'
export { panesManifest } from './manifest/test-support/panes-positional.js'
export {
  standInPanes,
  type StandInPanes,
  type StandInPaneTab,
  type StandInPaneWindow,
  type StandInPanesOptions,
} from './jxa/test-support/stand-in-panes.js'
