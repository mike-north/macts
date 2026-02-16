import { z } from 'zod';

/**
 * Schema for resource type inheritance/variants.
 * Used for union types like Alarm (DisplayAlarm | SoundAlarm | etc.)
 */
export const InheritanceSchema = z.object({
  /** Property used to discriminate between variants */
  discriminator: z.string(),
  /** Whether this is an abstract base type (cannot be instantiated) */
  abstract: z.boolean().default(false),
  /** Variant types extending this base */
  variants: z.record(
    z.string(),
    z.object({
      /** Additional properties specific to this variant */
      properties: z
        .record(
          z.string(),
          z.lazy(() => z.any())
        )
        .optional(),
      /** Description of this variant */
      description: z.string().optional(),
    })
  ),
});
export type Inheritance = z.infer<typeof InheritanceSchema>;
