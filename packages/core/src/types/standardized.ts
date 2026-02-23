import { z } from 'zod'

/**
 * ISO 8601 date-time string or Date object.
 * Used for dates throughout macts.
 */
export const DateTypeSchema = z.union([z.date(), z.iso.datetime()])
export type DateType = z.infer<typeof DateTypeSchema>

/**
 * ISO 8601 duration string.
 * Examples: "PT1H" (1 hour), "P1D" (1 day), "PT30M" (30 minutes)
 */
export const DurationTypeSchema = z
  .string()
  .regex(
    /^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/,
    'Invalid ISO 8601 duration'
  )
export type DurationType = z.infer<typeof DurationTypeSchema>

/**
 * Hex color string (#RRGGBB format).
 */
export const ColorTypeSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
export type ColorType = z.infer<typeof ColorTypeSchema>

/**
 * POSIX path string.
 */
export const PathTypeSchema = z.string().min(1)
export type PathType = z.infer<typeof PathTypeSchema>

/**
 * Point with x, y coordinates.
 */
export const PointTypeSchema = z.object({
  x: z.number(),
  y: z.number(),
})
export type PointType = z.infer<typeof PointTypeSchema>

/**
 * Rectangle with position and size.
 */
export const RectTypeSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})
export type RectType = z.infer<typeof RectTypeSchema>

/**
 * RGB color with 0-255 values.
 */
export const RgbTypeSchema = z.object({
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
})
export type RgbType = z.infer<typeof RgbTypeSchema>

/**
 * File reference (POSIX path).
 */
export const FileTypeSchema = z.object({
  path: z.string(),
  exists: z.boolean().optional(),
})
export type FileType = z.infer<typeof FileTypeSchema>
