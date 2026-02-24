/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** A media item, such as a photo or video */
export interface MediaItem {
  /** The unique ID of the media item */
  id: string;
  /** The name (title) of the media item */
  name: string;
  /** A description of the media item */
  description: string;
  /** The name of the file on disk */
  filename: string;
  /** The date of the media item */
  date: Date;
  /** The height of the media item in pixels */
  height: number;
  /** The width of the media item in pixels */
  width: number;
  /** The GPS altitude in meters */
  altitude: number;
  /** The GPS latitude and longitude, in an ordered list of 2 numbers or missing values */
  location: unknown;
  /** Whether the media item has been favorited */
  favorite: boolean;
  /** A list of keywords to associate with a media item */
  keywords: string[];
  /** The selected media item file size */
  size: number;
}

/** Input for creating a MediaItem */
export interface MediaItemCreateInput {
  /** The name (title) of the media item */
  name?: string;
  /** A description of the media item */
  description?: string;
  /** The date of the media item */
  date?: Date;
  /** The GPS latitude and longitude, in an ordered list of 2 numbers or missing values */
  location?: unknown;
  /** Whether the media item has been favorited */
  favorite?: boolean;
  /** A list of keywords to associate with a media item */
  keywords?: string[];
  /** The selected media item file size */
  size?: number;
}

/** Input for updating a MediaItem */
export type MediaItemUpdateInput = Partial<MediaItemCreateInput>;

/** Base class for collections that contains other items, such as albums and folders */
export interface Container {
  /** The unique ID of this container */
  id: string;
  /** The name of this container */
  name: string;
  /** This container's parent folder, if any */
  parent: Folder;
}

/** Input for creating a Container */
export interface ContainerCreateInput {
  /** The name of this container */
  name?: string;
}

/** Input for updating a Container */
export type ContainerUpdateInput = Partial<ContainerCreateInput>;

/** An album. A container that holds media items */
export interface Album {
  /** The unique ID of this album */
  id: string;
  /** The name of this album */
  name: string;
  /** This album's parent folder, if any */
  parent: Folder;
}

/** Input for creating a Album */
export interface AlbumCreateInput {
  /** The name of this album */
  name?: string;
}

/** Input for updating a Album */
export type AlbumUpdateInput = Partial<AlbumCreateInput>;

/** A folder. A container that holds albums and other folders, but not media items */
export interface Folder {
  /** The unique ID of this folder */
  id: string;
  /** The name of this folder */
  name: string;
  /** This folder's parent folder, if any */
  parent: Folder;
}

/** Input for creating a Folder */
export interface FolderCreateInput {
  /** The name of this folder */
  name?: string;
}

/** Input for updating a Folder */
export type FolderUpdateInput = Partial<FolderCreateInput>;

/** A set of media items that represents a Moment */
export interface Moment {
  /** The unique ID of the Moment */
  id: string;
  /** The name of the Moment */
  name: string;
}

/** Input for creating a Moment */
export type MomentCreateInput = Record<string, never>;

/** Input for updating a Moment */
export type MomentUpdateInput = Partial<MomentCreateInput>;

// Zod schemas for runtime validation

export const MediaItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  filename: z.string(),
  date: z.string(),
  height: z.number(),
  width: z.number(),
  altitude: z.number(),
  location: z.unknown(),
  favorite: z.boolean(),
  keywords: z.array(z.string()),
  size: z.number(),
});

export const ContainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string(),
});

export const AlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string(),
});

export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string(),
});

export const MomentSchema = z.object({
  id: z.string(),
  name: z.string(),
});
