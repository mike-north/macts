/**
 * Reading an app object's zero-based position within its container from the
 * object's own specifier.
 *
 * A positional resource has no identifier (`../manifest/positional.ts`), so a
 * reference to one of its objects is an index selector within its container,
 * and the codec must know the object's position. The app's dictionary
 * `index` property is not that position: its base differs from app to app,
 * and even between classes of one app (iTerm's window `index` counts from 1,
 * its tab `index` from 0). The position is taken instead from the specifier
 * the app returns for the object, whose last step addresses the object by
 * position within its container: `….tabs.at(0)` in the automation bridge's
 * display form, zero-based.
 *
 * The reader fails closed: it accepts only a display form whose final steps
 * are `.<collection>.at(N)`, for the collection the resource is found in
 * (`tabs`), held by a container rather than by the application, with `N` a
 * canonical non-negative safe integer. It answers `undefined` for anything
 * else, which the codec reports as a reference it cannot convert
 * (`InternalError`). It never falls back to another property.
 *
 * {@link NATIVE_POSITION_READER} is the automation-process function a native
 * script hands the codec as `positionOf`; a live test can run it against the
 * real app to check the display form it parses.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D9
 * @see https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html
 */

/**
 * Name of the top-level function {@link NATIVE_POSITION_READER} defines:
 * `(specifier, collection) => number | undefined`.
 */
export const NATIVE_POSITION_FUNCTION = '__mactsPositionOf'

/**
 * The zero-based position a specifier's display form gives within
 * `collection` of its container, or `undefined` when its final steps are not
 * `.<collection>.at(N)` after a container's own step: a position in another
 * collection, or in the application's own, is no position within the
 * container.
 *
 * @remarks
 * It is embedded into the automation process through
 * `Function.prototype.toString()`, so it references nothing outside itself
 * and uses only language built-ins.
 *
 * @param display - The bridge's display form of a specifier, such as
 *   `Application("iTerm2").windows.byId(7).tabs.at(0)`.
 * @param collection - The collection accessor the resource is found in, such
 *   as `tabs`.
 * @returns The position, or `undefined`.
 */
export function specifierPosition(display: unknown, collection: unknown): number | undefined {
  if (typeof display !== 'string' || typeof collection !== 'string') return undefined
  const match = /^(.*)\.([A-Za-z_$][\w$]*)\.at\((0|[1-9][0-9]*)\)$/.exec(display)
  if (match === null) return undefined
  const [, container, name, digits] = match
  if (name !== collection || container === undefined || digits === undefined) return undefined
  // The container's own step: a bare application holds the collection itself.
  if (/^Application\([^()]*\)$/.test(container)) return undefined
  const position = Number(digits)
  return Number.isSafeInteger(position) ? position : undefined
}

/**
 * Automation-process JavaScript defining {@link NATIVE_POSITION_FUNCTION}: the
 * position an app object's specifier gives ({@link specifierPosition}),
 * read through the bridge's `Automation.getDisplayString`. A specifier the
 * bridge cannot display gives `undefined`, as any non-positional one does.
 */
export const NATIVE_POSITION_READER: { readonly prelude: string } = Object.freeze({
  prelude: `var ${NATIVE_POSITION_FUNCTION} = (function () {
  'use strict';
  var position = (${specifierPosition.toString()});
  return function (specifier, collection) {
    var display;
    try {
      display = Automation.getDisplayString(specifier);
    } catch (e) {
      return undefined;
    }
    return position(display, collection);
  };
})();
`,
})
