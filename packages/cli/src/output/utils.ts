/**
 * Shared utilities for output formatters.
 *
 * @packageDocumentation
 */

/**
 * RGB color object structure.
 */
export interface RgbColor {
  r: number
  g: number
  b: number
}

/**
 * Check if a value is an RGB color object.
 *
 * @param value - Value to check
 * @returns True if value has r, g, b number properties
 */
export function isRgb(value: unknown): value is RgbColor {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['r'] === 'number' && typeof obj['g'] === 'number' && typeof obj['b'] === 'number'
  )
}
