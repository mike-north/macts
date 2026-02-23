/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** A shortcut in the Shortcuts application */
export interface Shortcut {
  /** The name of the shortcut */
  name: string;
  /** The shortcut's subtitle */
  subtitle: string;
  /** The unique identifier of the shortcut */
  id: string;
  /** The folder containing this shortcut (folder ID) */
  folder: string;
  /** The shortcut's color */
  color: { r: number; g: number; b: number };
  /** The shortcut's icon (TIFF image data) */
  icon: ArrayBuffer;
  /** Indicates whether or not the shortcut accepts input data */
  acceptsInput: boolean;
  /** The number of actions in the shortcut */
  actionCount: number;
}

/** Input for creating a Shortcut */
export interface ShortcutCreateInput {
  /** The folder containing this shortcut (folder ID) */
  folder?: string;
}

/** Input for updating a Shortcut */
export type ShortcutUpdateInput = Partial<ShortcutCreateInput>;

/** A folder containing shortcuts */
export interface Folder {
  /** The name of the folder */
  name: string;
  /** The unique identifier of the folder */
  id: string;
}

/** Input for creating a Folder */
export interface FolderCreateInput {
  /** The name of the folder */
  name?: string;
}

/** Input for updating a Folder */
export type FolderUpdateInput = Partial<FolderCreateInput>;

// Zod schemas for runtime validation

export const ShortcutSchema = z.object({
  name: z.string(),
  subtitle: z.string(),
  id: z.string(),
  folder: z.string(),
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  icon: z.string(),
  acceptsInput: z.boolean(),
  actionCount: z.number(),
});

export const FolderSchema = z.object({
  name: z.string(),
  id: z.string(),
});
