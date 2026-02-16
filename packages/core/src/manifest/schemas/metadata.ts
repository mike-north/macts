import { z } from 'zod';

/**
 * Schema for suite organization from AppleScript dictionary.
 */
export const SuiteSchema = z.object({
  /** Suite name */
  name: z.string(),
  /** Human-readable description */
  description: z.string().optional(),
  /** AppleScript four-character code */
  code: z.string().length(4).optional(),
  /** Resources in this suite */
  resources: z.array(z.string()).default([]),
  /** Commands in this suite */
  commands: z.array(z.string()).default([]),
  /** Enums in this suite */
  enums: z.array(z.string()).default([]),
});
export type Suite = z.infer<typeof SuiteSchema>;

/**
 * Schema for deprecation information.
 */
export const DeprecationSchema = z.object({
  /** Deprecation message */
  message: z.string(),
  /** Version when deprecated */
  since: z.string().optional(),
  /** Whether this is upstream deprecation (from Apple) vs macts */
  upstream: z.boolean().default(true),
  /** Suggested replacement */
  replacement: z.string().optional(),
});
export type Deprecation = z.infer<typeof DeprecationSchema>;

/**
 * Schema for extraction confidence scores.
 * Values from 0.0 (no confidence) to 1.0 (fully confident).
 */
export const ConfidenceSchema = z.object({
  /** Overall extraction confidence */
  overall: z.number().min(0).max(1),
  /** Per-field confidence scores */
  fields: z.record(z.string(), z.number().min(0).max(1)).optional(),
});
export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * Schema for open questions from extraction.
 */
export const OpenQuestionSchema = z.object({
  /** The question being asked */
  question: z.string(),
  /** Context about where this question arose */
  context: z.string().optional(),
  /** Suggested answers to choose from */
  suggestions: z.array(z.string()).optional(),
  /** Related resource/command/property */
  relatedTo: z.string().optional(),
});
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;

/**
 * TCC (Transparency, Consent, and Control) entitlements.
 */
export const TccEntitlementSchema = z.enum([
  'calendar',
  'contacts',
  'reminders',
  'photos',
  'music',
  'files',
  'accessibility',
  'automation',
]);
export type TccEntitlement = z.infer<typeof TccEntitlementSchema>;

/**
 * App distribution model.
 */
export const DistributionModelSchema = z.enum(['app-store', 'developer-id', 'system']);
export type DistributionModel = z.infer<typeof DistributionModelSchema>;

/**
 * Schema for app-level metadata.
 */
export const AppMetadataSchema = z.object({
  /** Bundle identifier (com.apple.iCal) */
  bundleId: z.string(),
  /** App name (internal) */
  name: z.string(),
  /** Display name shown to users */
  displayName: z.string().optional(),
  /** App version */
  version: z.string().optional(),
  /** Minimum macOS version required */
  minMacOSVersion: z.string().optional(),
  /** Path to app icon */
  icon: z.string().optional(),
  /** Required TCC entitlements */
  tccEntitlements: z.array(TccEntitlementSchema).default([]),
  /** Distribution model */
  distributionModel: DistributionModelSchema.optional(),
});
export type AppMetadata = z.infer<typeof AppMetadataSchema>;

/**
 * Schema for extraction metadata.
 */
export const ExtractionMetadataSchema = z.object({
  /** When the manifest was extracted */
  extractedAt: z.iso.datetime().optional(),
  /** Version of macts used for extraction */
  mactsVersion: z.string().optional(),
  /** Source dictionary file */
  sourceFile: z.string().optional(),
  /** Confidence scores */
  confidence: ConfidenceSchema.optional(),
  /** Open questions for human review */
  openQuestions: z.array(OpenQuestionSchema).default([]),
});
export type ExtractionMetadata = z.infer<typeof ExtractionMetadataSchema>;
