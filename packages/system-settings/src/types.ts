/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** A settings pane. */
export interface Pane {
  /** The id of the settings pane. */
  id: string;
  /** The name of the settings pane. */
  name: string;
}

/** Input for creating a Pane */
export interface PaneCreateInput {
}

/** Input for updating a Pane */
export type PaneUpdateInput = Partial<PaneCreateInput>;

/** An anchor within a settings pane. */
export interface Anchor {
  /** The name of the anchor. */
  name: string;
}

/** Input for creating a Anchor */
export interface AnchorCreateInput {
}

/** Input for updating a Anchor */
export type AnchorUpdateInput = Partial<AnchorCreateInput>;

// Zod schemas for runtime validation

export const PaneSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const AnchorSchema = z.object({
  name: z.string(),
});
