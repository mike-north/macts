/**
 * How a manifest's declared types name a resource or an enum.
 *
 * A property's type, a command parameter's type, or a command's `returns` may
 * name a resource or an enum by its key, its `name`, or (for a resource) its
 * `plural`, written in any case and with or without spaces, dashes or
 * underscores. The contract generator resolves those names, and the manifest
 * schema checks them (a usable type may not name a resource marked
 * unsupported); both match names through {@link normalizeTypeName}, so the
 * two cannot disagree about what a type names.
 */

/**
 * Normalize a type name for matching: lowercased, with spaces, dashes, and
 * underscores removed, so `"text item"`, `"TextItem"`, and `"text-item"` match.
 *
 * @internal Used within this package only (the contract generator and the
 * manifest schema).
 */
export function normalizeTypeName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]/g, '')
}
