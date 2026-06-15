/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** A window. */
export interface Window {
  /** The given name of the window. */
  givenName: string
  /** The full title of the window. */
  name: string
  /** The unique identifier of the window. */
  id: string
  /** The index of the window, ordered front to back. */
  index: number
  /** The bounding rectangle of the window. */
  bounds: { x: number; y: number; width: number; height: number }
  /** Whether the window has a close box. */
  closeable: boolean
  /** Whether the window can be minimized. */
  minimizable: boolean
  /** Whether the window is currently minimized. */
  minimized: boolean
  /** Whether the window can be resized. */
  resizable: boolean
  /** Whether the window is currently visible. */
  visible: boolean
  /** Whether the window can be zoomed. */
  zoomable: boolean
  /** Whether the window is currently zoomed. */
  zoomed: boolean
  /** Returns the currently selected tab */
  activeTab: Tab
  /** Represents the mode of the window which can be 'normal' or 'incognito', can be set only once during creation of the window. */
  mode: string
  /** The index of the active tab. */
  activeTabIndex: number
}

/** Input for creating a Window */
export interface WindowCreateInput {
  /** The given name of the window. */
  givenName?: string
  /** The index of the window, ordered front to back. */
  index?: number
  /** The bounding rectangle of the window. */
  bounds?: { x: number; y: number; width: number; height: number }
  /** Whether the window is currently minimized. */
  minimized?: boolean
  /** Whether the window is currently visible. */
  visible?: boolean
  /** Whether the window is currently zoomed. */
  zoomed?: boolean
  /** Window mode (normal or incognito) */
  mode?: string
  /** The index of the active tab. */
  activeTabIndex?: number
}

/** Input for updating a Window */
export type WindowUpdateInput = Partial<WindowCreateInput>

/** A tab. */
export interface Tab {
  /** Unique ID of the tab. */
  id: string
  /** The title of the tab. */
  title: string
  /** The url visible to the user. */
  uRL: string
  /** Is loading? */
  loading: boolean
}

/** Input for creating a Tab */
export interface TabCreateInput {
  /** URL to load in the tab */
  uRL?: string
  /** Window identifier for the tab */
  windowId: string
}

/** Input for updating a Tab */
export type TabUpdateInput = Partial<TabCreateInput>

/** A bookmarks folder that contains other bookmarks folder and bookmark items. */
export interface BookmarkFolder {
  /** Unique ID of the bookmark folder. */
  id: string
  /** The title of the folder. */
  title: string
  /** Returns the index with respect to its parent bookmark folder. */
  index: number
}

/** Input for creating a BookmarkFolder */
export interface BookmarkFolderCreateInput {
  /** The title of the folder. */
  title?: string
}

/** Input for updating a BookmarkFolder */
export type BookmarkFolderUpdateInput = Partial<BookmarkFolderCreateInput>

/** An item consists of an URL and the title of a bookmark */
export interface BookmarkItem {
  /** Unique ID of the bookmark item. */
  id: string
  /** The title of the bookmark item. */
  title: string
  /** The URL of the bookmark. */
  uRL: string
  /** Returns the index with respect to its parent bookmark folder. */
  index: number
}

/** Input for creating a BookmarkItem */
export interface BookmarkItemCreateInput {
  /** The title of the bookmark item. */
  title?: string
  /** The URL of the bookmark. */
  uRL?: string
}

/** Input for updating a BookmarkItem */
export type BookmarkItemUpdateInput = Partial<BookmarkItemCreateInput>

// Zod schemas for runtime validation

export const WindowSchema = z.object({
  givenName: z.string(),
  name: z.string(),
  id: z.string(),
  index: z.number(),
  bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
  closeable: z.boolean(),
  minimizable: z.boolean(),
  minimized: z.boolean(),
  resizable: z.boolean(),
  visible: z.boolean(),
  zoomable: z.boolean(),
  zoomed: z.boolean(),
  activeTab: z.string(),
  mode: z.string(),
  activeTabIndex: z.number(),
})

export const TabSchema = z.object({
  id: z.string(),
  title: z.string(),
  uRL: z.string(),
  loading: z.boolean(),
})

export const BookmarkFolderSchema = z.object({
  id: z.string(),
  title: z.string(),
  index: z.number(),
})

export const BookmarkItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  uRL: z.string(),
  index: z.number(),
})
