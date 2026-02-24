/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** An application's window */
export interface Window {
  /** The unique identifier of the window. */
  id: string;
  /** The full title of the window. */
  name: string;
  /** The index of the window, ordered front to back. */
  index: number;
  /** Whether the window has a close box. */
  closeable: boolean;
  /** Whether the window can be minimized. */
  minimizable: boolean;
  /** Whether the window is currently minimized. */
  minimized: boolean;
  /** Whether the window can be resized. */
  resizable: boolean;
  /** Whether the window is currently visible. */
  visible: boolean;
  /** Whether the window can be zoomed. */
  zoomable: boolean;
  /** Whether the window is currently zoomed. */
  zoomed: boolean;
  /** Returns the currently selected tab */
  activeTab: Tab;
  /** Returns the currently active space */
  activeSpace: Space;
  /** Whether the window is an incognito window. */
  incognito: boolean;
  /** Represents the mode of the window which can be 'normal' or 'incognito', can be set only once during creation of the window. */
  mode: string;
}

/** Input for creating a Window */
export interface WindowCreateInput {
  /** The index of the window, ordered front to back. */
  index?: number;
  /** Whether the window is currently minimized. */
  minimized?: boolean;
  /** Whether the window is currently visible. */
  visible?: boolean;
  /** Whether the window is currently zoomed. */
  zoomed?: boolean;
  /** Whether the window is an incognito window. */
  incognito?: boolean;
  /** Represents the mode of the window which can be 'normal' or 'incognito', can be set only once during creation of the window. */
  mode?: string;
}

/** Input for updating a Window */
export type WindowUpdateInput = Partial<WindowCreateInput>;

/** A window's tab */
export interface Tab {
  /** The unique identifier of the tab. */
  id: string;
  /** The full title of the tab. */
  title: string;
  /** The url of the tab. */
  uRL: string;
  /** Is loading? */
  loading: boolean;
  /** Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'. */
  location: string;
}

/** Input for creating a Tab */
export interface TabCreateInput {
  /** The url of the tab. */
  uRL?: string;
  /** Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'. */
  location?: string;
}

/** Input for updating a Tab */
export type TabUpdateInput = Partial<TabCreateInput>;

/** A space */
export interface Space {
  /** The unique identifier of the space. */
  id: string;
  /** The full title of the space. */
  title: string;
}

/** Input for creating a Space */
export type SpaceCreateInput = Record<string, never>;

/** Input for updating a Space */
export type SpaceUpdateInput = Partial<SpaceCreateInput>;

// Zod schemas for runtime validation

export const WindowSchema = z.object({
  id: z.string(),
  name: z.string(),
  index: z.number(),
  closeable: z.boolean(),
  minimizable: z.boolean(),
  minimized: z.boolean(),
  resizable: z.boolean(),
  visible: z.boolean(),
  zoomable: z.boolean(),
  zoomed: z.boolean(),
  activeTab: z.string(),
  activeSpace: z.string(),
  incognito: z.boolean(),
  mode: z.string(),
});

export const TabSchema = z.object({
  id: z.string(),
  title: z.string(),
  uRL: z.string(),
  loading: z.boolean(),
  location: z.string(),
});

export const SpaceSchema = z.object({
  id: z.string(),
  title: z.string(),
});
