/**
 * Finder HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ContainerResourceClient } from './resources/container.js';
import { DiskResourceClient } from './resources/disk.js';
import { FolderResourceClient } from './resources/folder.js';
import { DesktopObjectResourceClient } from './resources/desktopobject.js';
import { TrashObjectResourceClient } from './resources/trashobject.js';
import { FileResourceClient } from './resources/file.js';
import { AliasFileResourceClient } from './resources/aliasfile.js';
import { ApplicationFileResourceClient } from './resources/applicationfile.js';
import { DocumentFileResourceClient } from './resources/documentfile.js';
import { InternetLocationFileResourceClient } from './resources/internetlocationfile.js';
import { ClippingResourceClient } from './resources/clipping.js';
import { PackageResourceClient } from './resources/package.js';
import { FinderWindowResourceClient } from './resources/finderwindow.js';
import { ClippingWindowResourceClient } from './resources/clippingwindow.js';
import { ListViewOptionsResourceClient } from './resources/listviewoptions.js';
import { ColumnResourceClient } from './resources/column.js';


/**
 * Client configuration options.
 */
export interface FinderClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string;
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl;
    this.#apiKey = apiKey;
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { code?: string; message?: string } };
      const code = error?.error?.code ?? 'UNKNOWN_ERROR';
      const message = error?.error?.message ?? `HTTP ${response.status}`;
      throw new FinderError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Finder API errors.
 */
export class FinderError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'FinderError';
    this.code = code;
  }
}

/**
 * Finder client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new FinderClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class FinderClient {
  readonly #httpClient: HttpClient;

  /** An item that contains other items */
  readonly containers: ContainerResourceClient;

  /** A disk */
  readonly disks: DiskResourceClient;

  /** A folder */
  readonly folders: FolderResourceClient;

  /** Desktop-object is the class of the "desktop" object */
  readonly desktopobjects: DesktopObjectResourceClient;

  /** Trash-object is the class of the “trash” object */
  readonly trashobjects: TrashObjectResourceClient;

  /** A file */
  readonly files: FileResourceClient;

  /** An alias file (created with “Make Alias”) */
  readonly aliasfiles: AliasFileResourceClient;

  /** An application's file on disk */
  readonly applicationfiles: ApplicationFileResourceClient;

  /** A document file */
  readonly documentfiles: DocumentFileResourceClient;

  /** A file containing an internet location */
  readonly internetlocationfiles: InternetLocationFileResourceClient;

  /** A clipping */
  readonly clippings: ClippingResourceClient;

  /** A package */
  readonly packages: PackageResourceClient;

  /** A file viewer window */
  readonly finderwindows: FinderWindowResourceClient;

  /** The window containing a clipping */
  readonly clippingwindows: ClippingWindowResourceClient;

  /** the list view options */
  readonly listviewoptionss: ListViewOptionsResourceClient;

  /** a column of a list view */
  readonly columns: ColumnResourceClient;

  constructor(options: FinderClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.containers = new ContainerResourceClient(this.#httpClient, 'finder', 'containers');
    this.disks = new DiskResourceClient(this.#httpClient, 'finder', 'disks');
    this.folders = new FolderResourceClient(this.#httpClient, 'finder', 'folders');
    this.desktopobjects = new DesktopObjectResourceClient(this.#httpClient, 'finder', 'desktopobjects');
    this.trashobjects = new TrashObjectResourceClient(this.#httpClient, 'finder', 'trashobjects');
    this.files = new FileResourceClient(this.#httpClient, 'finder', 'files');
    this.aliasfiles = new AliasFileResourceClient(this.#httpClient, 'finder', 'aliasfiles');
    this.applicationfiles = new ApplicationFileResourceClient(this.#httpClient, 'finder', 'applicationfiles');
    this.documentfiles = new DocumentFileResourceClient(this.#httpClient, 'finder', 'documentfiles');
    this.internetlocationfiles = new InternetLocationFileResourceClient(this.#httpClient, 'finder', 'internetlocationfiles');
    this.clippings = new ClippingResourceClient(this.#httpClient, 'finder', 'clippings');
    this.packages = new PackageResourceClient(this.#httpClient, 'finder', 'packages');
    this.finderwindows = new FinderWindowResourceClient(this.#httpClient, 'finder', 'finderwindows');
    this.clippingwindows = new ClippingWindowResourceClient(this.#httpClient, 'finder', 'clippingwindows');
    this.listviewoptionss = new ListViewOptionsResourceClient(this.#httpClient, 'finder', 'listviewoptionss');
    this.columns = new ColumnResourceClient(this.#httpClient, 'finder', 'columns');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Open the specified object(s)
   */
  async open(using?: string, withProperties?: unknown): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.open', { using, withProperties });
  }


  /**
   * Print the specified object(s)
   */
  async print(withProperties?: unknown): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.print', { withProperties });
  }


  /**
   * Quit the Finder
   */
  async quit(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.quit', {});
  }


  /**
   * Activate the specified window (or the Finder)
   */
  async activate(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.activate', {});
  }


  /**
   * Close an object
   */
  async close(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.close', {});
  }


  /**
   * Return the number of elements of a particular class within an object
   */
  async count(each: string): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.count', { each });
  }


  /**
   * Return the size in bytes of an object
   */
  async dataSize(as?: string): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.dataSize', { as });
  }


  /**
   * Move an item from its container to the trash
   */
  async _delete(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.delete', {});
  }


  /**
   * Duplicate one or more object(s)
   */
  async duplicate(to?: string, replacing?: boolean, routingSuppressed?: boolean, exactCopy?: boolean): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.duplicate', { to, replacing, routingSuppressed, exactCopy });
  }


  /**
   * Verify if an object exists
   */
  async exists(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.exists', {});
  }


  /**
   * Make a new element
   */
  async make(_new: string, at: string, to?: string, withProperties?: unknown): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.make', { 'new': _new, at, to, withProperties });
  }


  /**
   * Move object(s) to a new location
   */
  async move(to: string, replacing?: boolean, positionedAt?: string, routingSuppressed?: boolean): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.move', { to, replacing, positionedAt, routingSuppressed });
  }


  /**
   * Select the specified object(s)
   */
  async select(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.select', {});
  }


  /**
   * Private event to open a virtual location
   */
  async openVirtualLocation(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.openVirtualLocation', {});
  }


  /**
   * (NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)
   */
  async copy(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.copy', {});
  }


  /**
   * Return the specified object(s) in a sorted list
   */
  async sort(by: string): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.sort', { by });
  }


  /**
   * Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)
   */
  async cleanUp(by?: string): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.cleanUp', { by });
  }


  /**
   * Eject the specified disk(s)
   */
  async eject(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.eject', {});
  }


  /**
   * Empty the trash
   */
  async empty(security?: boolean): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.empty', { security });
  }


  /**
   * (NOT AVAILABLE) Erase the specified disk(s)
   */
  async erase(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.erase', {});
  }


  /**
   * Bring the specified object(s) into view
   */
  async reveal(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.reveal', {});
  }


  /**
   * Update the display of the specified object(s) to match their on-disk representation
   */
  async update(necessity?: boolean, registeringApplications?: boolean): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.update', { necessity, registeringApplications });
  }


  /**
   * Restart the computer
   */
  async restart(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.restart', {});
  }


  /**
   * Shut Down the computer
   */
  async shutDown(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.shutDown', {});
  }


  /**
   * Put the computer to sleep
   */
  async sleep(): Promise<void> {
    return this.#httpClient.rpc<void>('finder.app.sleep', {});
  }
}
