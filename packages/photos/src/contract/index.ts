/**
 * The Photos contract: the transport-neutral description of every
 * Photos operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `PhotosClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `PhotosClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { photosContract } from '@macts/photos/contract'
 *
 * const client = createClient(photosContract, { token, url })
 * ```
 *
 * Generated from the Photos manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type Integer,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** A media item, such as a photo or video */
export interface MediaItem {
  /** The unique ID of the media item */
  readonly id: string
  /** The name (title) of the media item */
  name: string
  /** A description of the media item */
  description: string
  /** The name of the file on disk */
  readonly filename: string
  /** The date of the media item */
  date: Date
  /** The height of the media item in pixels */
  readonly height: Integer
  /** The width of the media item in pixels */
  readonly width: Integer
  /** The GPS altitude in meters */
  readonly altitude: number
  /** The GPS latitude and longitude, in an ordered list of 2 numbers or missing values */
  location: unknown
  /** Whether the media item has been favorited */
  favorite: boolean
  /** A list of keywords to associate with a media item */
  keywords: readonly string[]
  /** The selected media item file size */
  size: Integer
}

/** Base class for collections that contains other items, such as albums and folders */
export interface Container {
  /** The unique ID of this container */
  readonly id: string
  /** The name of this container */
  name: string
  /** This container's parent folder, if any */
  readonly parent: ObjectReferenceVariant<Folder, string>
}

/** An album. A container that holds media items */
export interface Album {
  /** The unique ID of this album */
  readonly id: string
  /** The name of this album */
  name: string
  /** This album's parent folder, if any */
  readonly parent: ObjectReferenceVariant<Folder, string>
}

/** A folder. A container that holds albums and other folders, but not media items */
export interface Folder {
  /** The unique ID of this folder */
  readonly id: string
  /** The name of this folder */
  name: string
  /** This folder's parent folder, if any */
  readonly parent: ObjectReferenceVariant<Folder, string>
}

/** A set of media items that represents a Moment */
export interface Moment {
  /** The unique ID of the Moment */
  readonly id: string
  /** The name of the Moment */
  readonly name: string
}

/** Input for creating a MediaItem. */
export interface MediaItemCreateInput {
  /** The name (title) of the media item */
  name?: string
  /** A description of the media item */
  description?: string
  /** The date of the media item */
  date?: Date
  /** The GPS latitude and longitude, in an ordered list of 2 numbers or missing values */
  location?: unknown
  /** Whether the media item has been favorited */
  favorite?: boolean
  /** A list of keywords to associate with a media item */
  keywords?: readonly string[]
  /** The selected media item file size */
  size?: Integer
}

/** Input for updating a MediaItem. Omitted fields are left unchanged. */
export interface MediaItemUpdateInput {
  /** The name (title) of the media item */
  name?: string
  /** A description of the media item */
  description?: string
  /** The date of the media item */
  date?: Date
  /** The GPS latitude and longitude, in an ordered list of 2 numbers or missing values */
  location?: unknown
  /** Whether the media item has been favorited */
  favorite?: boolean
  /** A list of keywords to associate with a media item */
  keywords?: readonly string[]
  /** The selected media item file size */
  size?: Integer
}

/** Input for creating a Container. */
export interface ContainerCreateInput {
  /** The name of this container */
  name?: string
}

/** Input for updating a Container. Omitted fields are left unchanged. */
export interface ContainerUpdateInput {
  /** The name of this container */
  name?: string
}

/** Input for creating an Album. */
export interface AlbumCreateInput {
  /** The name of this album */
  name?: string
}

/** Input for updating an Album. Omitted fields are left unchanged. */
export interface AlbumUpdateInput {
  /** The name of this album */
  name?: string
}

/** Input for creating a Folder. */
export interface FolderCreateInput {
  /** The name of this folder */
  name?: string
}

/** Input for updating a Folder. Omitted fields are left unchanged. */
export interface FolderUpdateInput {
  /** The name of this folder */
  name?: string
}

/** Input for creating a Moment. */
export type MomentCreateInput = Record<string, never>

/** Input for updating a Moment. Omitted fields are left unchanged. */
export type MomentUpdateInput = Record<string, never>

/** A media item, such as a photo or video */
export interface MediaItemResourceClient {
  /** List mediaitems. */
  list(options?: CallOptions): Promise<readonly MediaItem[]>
  /** Read the mediaitem identified by `id`. */
  get(id: string, options?: CallOptions): Promise<MediaItem>
  /** Duplicate a media item */
  duplicate(id: string, options?: CallOptions): Promise<void>
}

/** An album. A container that holds media items */
export interface AlbumResourceClient {
  /** List albums. */
  list(options?: CallOptions): Promise<readonly Album[]>
  /** Read the album identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Album>
}

/** A folder. A container that holds albums and other folders, but not media items */
export interface FolderResourceClient {
  /** List folders. */
  list(options?: CallOptions): Promise<readonly Folder[]>
  /** Read the folder identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Folder>
}

/**
 * The Photos client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link photosContract}.
 */
export interface PhotosClient {
  /** A media item, such as a photo or video */
  readonly mediaitems: MediaItemResourceClient
  /** An album. A container that holds media items */
  readonly albums: AlbumResourceClient
  /** A folder. A container that holds albums and other folders, but not media items */
  readonly folders: FolderResourceClient
  /** Import files into the library */
  _import(
    files: readonly string[],
    into?: string,
    skipCheckDuplicates?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Export media items to the specified location as files */
  _export(
    mediaItems: readonly string[],
    to: string,
    usingOriginals?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Create a new album or folder */
  make(_new: string, named?: string, at?: string, options?: CallOptions): Promise<void>
  /** Delete an album or folder */
  _delete(target: string, options?: CallOptions): Promise<void>
  /** Add media items to an album */
  add(mediaItems: readonly string[], to: string, options?: CallOptions): Promise<void>
  /** Display an ad-hoc slide show from a list of media items */
  startSlideshow(using: readonly string[], options?: CallOptions): Promise<void>
  /** End the currently-playing slideshow */
  stopSlideshow(options?: CallOptions): Promise<void>
  /** Skip to next slide in currently-playing slideshow */
  nextSlide(options?: CallOptions): Promise<void>
  /** Skip to previous slide in currently-playing slideshow */
  previousSlide(options?: CallOptions): Promise<void>
  /** Pause the currently-playing slideshow */
  pauseSlideshow(options?: CallOptions): Promise<void>
  /** Resume the currently-playing slideshow */
  resumeSlideshow(options?: CallOptions): Promise<void>
  /** Show the image at path in the application */
  spotlight(target: string, options?: CallOptions): Promise<void>
  /** Search for items matching the search string */
  search(_for: string, options?: CallOptions): Promise<void>
}

const mediaItemRecordType: ValueType<MediaItem> = t.record(
  {
    id: t.string({ description: 'The unique ID of the media item' }),
    name: t.string({ description: 'The name (title) of the media item' }),
    description: t.string({ description: 'A description of the media item' }),
    filename: t.string({ description: 'The name of the file on disk' }),
    date: t.date({ description: 'The date of the media item' }),
    height: t.integer({ description: 'The height of the media item in pixels' }),
    width: t.integer({ description: 'The width of the media item in pixels' }),
    altitude: t.double({ description: 'The GPS altitude in meters' }),
    location: t.unknown({
      description:
        'The GPS latitude and longitude, in an ordered list of 2 numbers or missing values',
    }),
    favorite: t.boolean({ description: 'Whether the media item has been favorited' }),
    keywords: t.array(t.string(), {
      description: 'A list of keywords to associate with a media item',
    }),
    size: t.integer({ description: 'The selected media item file size' }),
  },
  { description: 'A media item, such as a photo or video' }
)

const containerRecordType: ValueType<Container> = t.record(
  {
    id: t.string({ description: 'The unique ID of this container' }),
    name: t.string({ description: 'The name of this container' }),
    parent: t.reference<Folder, string>(() => resources, 'Folder', 'one', {
      description: "This container's parent folder, if any",
    }),
  },
  {
    description: 'Base class for collections that contains other items, such as albums and folders',
  }
)

const albumRecordType: ValueType<Album> = t.record(
  {
    id: t.string({ description: 'The unique ID of this album' }),
    name: t.string({ description: 'The name of this album' }),
    parent: t.reference<Folder, string>(() => resources, 'Folder', 'one', {
      description: "This album's parent folder, if any",
    }),
  },
  { description: 'An album. A container that holds media items' }
)

const folderRecordType: ValueType<Folder> = t.record(
  {
    id: t.string({ description: 'The unique ID of this folder' }),
    name: t.string({ description: 'The name of this folder' }),
    parent: t.reference<Folder, string>(() => resources, 'Folder', 'one', {
      description: "This folder's parent folder, if any",
    }),
  },
  { description: 'A folder. A container that holds albums and other folders, but not media items' }
)

const momentRecordType: ValueType<Moment> = t.record(
  {
    id: t.string({ description: 'The unique ID of the Moment' }),
    name: t.string({ description: 'The name of the Moment' }),
  },
  { description: 'A set of media items that represents a Moment' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<PhotosClient>['resources'] = {
  MediaItem: {
    name: 'MediaItem',
    record: mediaItemRecordType,
    id: t.string({ description: 'The unique ID of the media item' }),
    get: 'photos.mediaitems.getMediaItem',
    list: 'photos.mediaitems.listMediaItems',
  },
  Container: {
    name: 'Container',
    record: containerRecordType,
    id: t.string({ description: 'The unique ID of this container' }),
  },
  Album: {
    name: 'Album',
    record: albumRecordType,
    id: t.string({ description: 'The unique ID of this album' }),
    get: 'photos.albums.getAlbum',
    list: 'photos.albums.listAlbums',
  },
  Folder: {
    name: 'Folder',
    record: folderRecordType,
    id: t.string({ description: 'The unique ID of this folder' }),
    get: 'photos.folders.getFolder',
    list: 'photos.folders.listFolders',
  },
  Moment: {
    name: 'Moment',
    record: momentRecordType,
    id: t.string({ description: 'The unique ID of the Moment' }),
  },
}

const mediaItemListMediaItemsOperation: OperationDescriptor<
  Record<string, never>,
  readonly MediaItem[]
> = {
  id: 'photos.mediaitems.listMediaItems',
  permission: 'photos:mediaItems:list',
  target: { command: 'listMediaItems', resource: 'MediaItem' },
  description: 'List all media items',
  input: t.record({}),
  output: t.array(mediaItemRecordType),
}

const mediaItemGetMediaItemOperation: OperationDescriptor<{ readonly id: string }, MediaItem> = {
  id: 'photos.mediaitems.getMediaItem',
  permission: 'photos:mediaItems:get',
  target: { command: 'getMediaItem', resource: 'MediaItem' },
  description: 'Get a media item by ID',
  input: t.record({
    id: t.string({ description: 'Media item identifier' }),
  }),
  output: mediaItemRecordType,
}

const albumListAlbumsOperation: OperationDescriptor<Record<string, never>, readonly Album[]> = {
  id: 'photos.albums.listAlbums',
  permission: 'photos:albums:list',
  target: { command: 'listAlbums', resource: 'Album' },
  description: 'List all albums',
  input: t.record({}),
  output: t.array(albumRecordType),
}

const albumGetAlbumOperation: OperationDescriptor<{ readonly id: string }, Album> = {
  id: 'photos.albums.getAlbum',
  permission: 'photos:albums:get',
  target: { command: 'getAlbum', resource: 'Album' },
  description: 'Get an album by ID',
  input: t.record({
    id: t.string({ description: 'Album identifier' }),
  }),
  output: albumRecordType,
}

const folderListFoldersOperation: OperationDescriptor<Record<string, never>, readonly Folder[]> = {
  id: 'photos.folders.listFolders',
  permission: 'photos:folders:list',
  target: { command: 'listFolders', resource: 'Folder' },
  description: 'List all folders',
  input: t.record({}),
  output: t.array(folderRecordType),
}

const folderGetFolderOperation: OperationDescriptor<{ readonly id: string }, Folder> = {
  id: 'photos.folders.getFolder',
  permission: 'photos:folders:get',
  target: { command: 'getFolder', resource: 'Folder' },
  description: 'Get a folder by ID',
  input: t.record({
    id: t.string({ description: 'Folder identifier' }),
  }),
  output: folderRecordType,
}

const appImportOperation: OperationDescriptor<
  {
    readonly files: readonly string[]
    readonly into?: string | undefined
    readonly skipCheckDuplicates?: boolean | undefined
  },
  undefined
> = {
  id: 'photos.app.import',
  permission: 'photos:import:files',
  target: { command: 'import' },
  description: 'Import files into the library',
  input: t.record({
    files: t.array(t.string(), { description: 'The list of files to copy' }),
    into: t.optional(t.string({ description: 'The album to import into' })),
    skipCheckDuplicates: t.optional(
      t.boolean({ description: 'Skip duplicate checking and import everything' })
    ),
  }),
  output: t.none(),
}

const appExportOperation: OperationDescriptor<
  {
    readonly mediaItems: readonly string[]
    readonly to: string
    readonly usingOriginals?: boolean | undefined
  },
  undefined
> = {
  id: 'photos.app.export',
  permission: 'photos:export:files',
  target: { command: 'export' },
  description: 'Export media items to the specified location as files',
  input: t.record({
    mediaItems: t.array(t.string(), { description: 'The list of media items to export' }),
    to: t.string({ description: 'The destination of the export' }),
    usingOriginals: t.optional(
      t.boolean({
        description: 'Export the original files if true, otherwise export rendered jpgs',
      })
    ),
  }),
  output: t.none(),
}

const mediaItemDuplicateOperation: OperationDescriptor<{ readonly id: string }, undefined> = {
  id: 'photos.mediaitems.duplicate',
  permission: 'photos:mediaItems:duplicate',
  target: { command: 'duplicate', resource: 'MediaItem' },
  description: 'Duplicate a media item',
  input: t.record({
    id: t.string({ description: 'The media item to duplicate' }),
  }),
  output: t.none(),
}

const appMakeOperation: OperationDescriptor<
  { readonly new: string; readonly named?: string | undefined; readonly at?: string | undefined },
  undefined
> = {
  id: 'photos.app.make',
  permission: 'photos:containers:create',
  target: { command: 'make' },
  description: 'Create a new album or folder',
  input: t.record({
    new: t.string({ description: 'The class of the new object (album or folder)' }),
    named: t.optional(t.string({ description: 'The name of the new object' })),
    at: t.optional(t.string({ description: 'The parent folder for the new object' })),
  }),
  output: t.none(),
}

const appDeleteOperation: OperationDescriptor<{ readonly target: string }, undefined> = {
  id: 'photos.app.delete',
  permission: 'photos:containers:delete',
  target: { command: 'delete' },
  description: 'Delete an album or folder',
  input: t.record({
    target: t.string({ description: 'The album or folder to delete' }),
  }),
  output: t.none(),
}

const appAddOperation: OperationDescriptor<
  { readonly mediaItems: readonly string[]; readonly to: string },
  undefined
> = {
  id: 'photos.app.add',
  permission: 'photos:albums:add',
  target: { command: 'add' },
  description: 'Add media items to an album',
  input: t.record({
    mediaItems: t.array(t.string(), { description: 'The list of media items to add' }),
    to: t.string({ description: 'The album to add to' }),
  }),
  output: t.none(),
}

const appStartSlideshowOperation: OperationDescriptor<
  { readonly using: readonly string[] },
  undefined
> = {
  id: 'photos.app.startSlideshow',
  permission: 'photos:slideshow:start',
  target: { command: 'startSlideshow' },
  description: 'Display an ad-hoc slide show from a list of media items',
  input: t.record({
    using: t.array(t.string(), { description: 'The media items to show' }),
  }),
  output: t.none(),
}

const appStopSlideshowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'photos.app.stopSlideshow',
  permission: 'photos:slideshow:stop',
  target: { command: 'stopSlideshow' },
  description: 'End the currently-playing slideshow',
  input: t.record({}),
  output: t.none(),
}

const appNextSlideOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'photos.app.nextSlide',
  permission: 'photos:slideshow:next',
  target: { command: 'nextSlide' },
  description: 'Skip to next slide in currently-playing slideshow',
  input: t.record({}),
  output: t.none(),
}

const appPreviousSlideOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'photos.app.previousSlide',
  permission: 'photos:slideshow:previous',
  target: { command: 'previousSlide' },
  description: 'Skip to previous slide in currently-playing slideshow',
  input: t.record({}),
  output: t.none(),
}

const appPauseSlideshowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'photos.app.pauseSlideshow',
  permission: 'photos:slideshow:pause',
  target: { command: 'pauseSlideshow' },
  description: 'Pause the currently-playing slideshow',
  input: t.record({}),
  output: t.none(),
}

const appResumeSlideshowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'photos.app.resumeSlideshow',
  permission: 'photos:slideshow:resume',
  target: { command: 'resumeSlideshow' },
  description: 'Resume the currently-playing slideshow',
  input: t.record({}),
  output: t.none(),
}

const appSpotlightOperation: OperationDescriptor<{ readonly target: string }, undefined> = {
  id: 'photos.app.spotlight',
  permission: 'photos:app:spotlight',
  target: { command: 'spotlight' },
  description: 'Show the image at path in the application',
  input: t.record({
    target: t.string({ description: 'The full path to the image or media item ID' }),
  }),
  output: t.none(),
}

const appSearchOperation: OperationDescriptor<{ readonly for: string }, undefined> = {
  id: 'photos.app.search',
  permission: 'photos:app:search',
  target: { command: 'search' },
  description: 'Search for items matching the search string',
  input: t.record({
    for: t.string({ description: 'The text to search for' }),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<PhotosClient>['operations'] = {
  'photos.mediaitems.listMediaItems': mediaItemListMediaItemsOperation,
  'photos.mediaitems.getMediaItem': mediaItemGetMediaItemOperation,
  'photos.albums.listAlbums': albumListAlbumsOperation,
  'photos.albums.getAlbum': albumGetAlbumOperation,
  'photos.folders.listFolders': folderListFoldersOperation,
  'photos.folders.getFolder': folderGetFolderOperation,
  'photos.app.import': appImportOperation,
  'photos.app.export': appExportOperation,
  'photos.mediaitems.duplicate': mediaItemDuplicateOperation,
  'photos.app.make': appMakeOperation,
  'photos.app.delete': appDeleteOperation,
  'photos.app.add': appAddOperation,
  'photos.app.startSlideshow': appStartSlideshowOperation,
  'photos.app.stopSlideshow': appStopSlideshowOperation,
  'photos.app.nextSlide': appNextSlideOperation,
  'photos.app.previousSlide': appPreviousSlideOperation,
  'photos.app.pauseSlideshow': appPauseSlideshowOperation,
  'photos.app.resumeSlideshow': appResumeSlideshowOperation,
  'photos.app.spotlight': appSpotlightOperation,
  'photos.app.search': appSearchOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): PhotosClient {
  return {
    mediaitems: {
      list: (options) => runtime.invoke(mediaItemListMediaItemsOperation, {}, options),
      get: (id, options) => runtime.invoke(mediaItemGetMediaItemOperation, { id }, options),
      duplicate: (id, options) => runtime.invoke(mediaItemDuplicateOperation, { id }, options),
    },
    albums: {
      list: (options) => runtime.invoke(albumListAlbumsOperation, {}, options),
      get: (id, options) => runtime.invoke(albumGetAlbumOperation, { id }, options),
    },
    folders: {
      list: (options) => runtime.invoke(folderListFoldersOperation, {}, options),
      get: (id, options) => runtime.invoke(folderGetFolderOperation, { id }, options),
    },
    _import: (files, into, skipCheckDuplicates, options) =>
      runtime.invoke(appImportOperation, { files, into, skipCheckDuplicates }, options),
    _export: (mediaItems, to, usingOriginals, options) =>
      runtime.invoke(appExportOperation, { mediaItems, to, usingOriginals }, options),
    make: (_new, named, at, options) =>
      runtime.invoke(appMakeOperation, { new: _new, named, at }, options),
    _delete: (target, options) => runtime.invoke(appDeleteOperation, { target }, options),
    add: (mediaItems, to, options) => runtime.invoke(appAddOperation, { mediaItems, to }, options),
    startSlideshow: (using, options) =>
      runtime.invoke(appStartSlideshowOperation, { using }, options),
    stopSlideshow: (options) => runtime.invoke(appStopSlideshowOperation, {}, options),
    nextSlide: (options) => runtime.invoke(appNextSlideOperation, {}, options),
    previousSlide: (options) => runtime.invoke(appPreviousSlideOperation, {}, options),
    pauseSlideshow: (options) => runtime.invoke(appPauseSlideshowOperation, {}, options),
    resumeSlideshow: (options) => runtime.invoke(appResumeSlideshowOperation, {}, options),
    spotlight: (target, options) => runtime.invoke(appSpotlightOperation, { target }, options),
    search: (_for, options) => runtime.invoke(appSearchOperation, { for: _for }, options),
  }
}

/**
 * The Photos contract. Pass it to a client factory to obtain a
 * {@link PhotosClient}.
 */
export const photosContract: AppContract<PhotosClient> = {
  app: 'photos',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
