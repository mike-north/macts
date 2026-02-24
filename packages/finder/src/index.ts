/**
 * Finder HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { FinderClient } from '@macts/sdk-finder';
 *
 * const client = new FinderClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { FinderClient, FinderError, HttpClient } from './client.js'
export type { FinderClientOptions } from './client.js'
export * from './types.js'
export { ContainerResourceClient } from './resources/container.js'
export { DiskResourceClient } from './resources/disk.js'
export { FolderResourceClient } from './resources/folder.js'
export { DesktopObjectResourceClient } from './resources/desktopobject.js'
export { TrashObjectResourceClient } from './resources/trashobject.js'
export { FileResourceClient } from './resources/file.js'
export { AliasFileResourceClient } from './resources/aliasfile.js'
export { ApplicationFileResourceClient } from './resources/applicationfile.js'
export { DocumentFileResourceClient } from './resources/documentfile.js'
export { InternetLocationFileResourceClient } from './resources/internetlocationfile.js'
export { ClippingResourceClient } from './resources/clipping.js'
export { PackageResourceClient } from './resources/package.js'
export { FinderWindowResourceClient } from './resources/finderwindow.js'
export { ClippingWindowResourceClient } from './resources/clippingwindow.js'
export { ListViewOptionsResourceClient } from './resources/listviewoptions.js'
export { ColumnResourceClient } from './resources/column.js'
