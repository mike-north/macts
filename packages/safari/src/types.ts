/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** A Safari document (window) */
export interface Document {
  /** The document name */
  name: string;
  /** The unique identifier of the document */
  id: string;
  /** The current URL */
  url: string;
}

/** Input for creating a Document */
export interface DocumentCreateInput {
  /** The current URL */
  url?: string;
}

/** Input for updating a Document */
export type DocumentUpdateInput = Partial<DocumentCreateInput>;

/** A Safari tab */
export interface Tab {
  /** The tab name */
  name: string;
  /** The unique identifier of the tab */
  id: string;
  /** The tab URL */
  url: string;
  /** The HTML source of the web page currently loaded in the tab */
  source: string;
  /** The text of the web page currently loaded in the tab */
  text: string;
}

/** Input for creating a Tab */
export interface TabCreateInput {
  /** The tab URL */
  url?: string;
}

/** Input for updating a Tab */
export type TabUpdateInput = Partial<TabCreateInput>;

// Zod schemas for runtime validation

export const DocumentSchema = z.object({
  name: z.string(),
  id: z.string(),
  url: z.string(),
});

export const TabSchema = z.object({
  name: z.string(),
  id: z.string(),
  url: z.string(),
  source: z.string(),
  text: z.string(),
});
