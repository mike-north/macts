/**
 * SystemEvents HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ConfigurationResourceClient } from './resources/configuration.js';
import { InterfaceResourceClient } from './resources/interface.js';
import { LocationResourceClient } from './resources/location.js';
import { NetworkPreferencesObjectResourceClient } from './resources/networkpreferencesobject.js';
import { ServiceResourceClient } from './resources/service.js';
import { AliasResourceClient } from './resources/alias.js';
import { ClassicDomainObjectResourceClient } from './resources/classicdomainobject.js';
import { DiskResourceClient } from './resources/disk.js';
import { DiskItemResourceClient } from './resources/diskitem.js';
import { DomainResourceClient } from './resources/domain.js';
import { FileResourceClient } from './resources/file.js';
import { FilePackageResourceClient } from './resources/filepackage.js';
import { FolderResourceClient } from './resources/folder.js';
import { LocalDomainObjectResourceClient } from './resources/localdomainobject.js';
import { NetworkDomainObjectResourceClient } from './resources/networkdomainobject.js';
import { SystemDomainObjectResourceClient } from './resources/systemdomainobject.js';
import { UserDomainObjectResourceClient } from './resources/userdomainobject.js';
import { ActionResourceClient } from './resources/action.js';
import { AttributeResourceClient } from './resources/attribute.js';
import { BrowserResourceClient } from './resources/browser.js';
import { BusyIndicatorResourceClient } from './resources/busyindicator.js';
import { ButtonResourceClient } from './resources/button.js';
import { CheckboxResourceClient } from './resources/checkbox.js';
import { ColorWellResourceClient } from './resources/colorwell.js';
import { ColumnResourceClient } from './resources/column.js';
import { ComboBoxResourceClient } from './resources/combobox.js';
import { DrawerResourceClient } from './resources/drawer.js';
import { GroupResourceClient } from './resources/group.js';
import { GrowAreaResourceClient } from './resources/growarea.js';
import { ImageResourceClient } from './resources/image.js';
import { IncrementorResourceClient } from './resources/incrementor.js';
import { ListResourceClient } from './resources/list.js';
import { MenuResourceClient } from './resources/menu.js';
import { MenuBarResourceClient } from './resources/menubar.js';
import { MenuBarItemResourceClient } from './resources/menubaritem.js';
import { MenuButtonResourceClient } from './resources/menubutton.js';
import { MenuItemResourceClient } from './resources/menuitem.js';
import { OutlineResourceClient } from './resources/outline.js';
import { PopOverResourceClient } from './resources/popover.js';
import { PopUpButtonResourceClient } from './resources/popupbutton.js';
import { ProcessResourceClient } from './resources/process.js';
import { ProgressIndicatorResourceClient } from './resources/progressindicator.js';
import { RadioButtonResourceClient } from './resources/radiobutton.js';
import { RadioGroupResourceClient } from './resources/radiogroup.js';
import { RelevanceIndicatorResourceClient } from './resources/relevanceindicator.js';
import { RowResourceClient } from './resources/row.js';
import { ScrollAreaResourceClient } from './resources/scrollarea.js';
import { ScrollBarResourceClient } from './resources/scrollbar.js';
import { SheetResourceClient } from './resources/sheet.js';
import { SliderResourceClient } from './resources/slider.js';
import { SplitterResourceClient } from './resources/splitter.js';
import { SplitterGroupResourceClient } from './resources/splittergroup.js';
import { StaticTextResourceClient } from './resources/statictext.js';
import { TabGroupResourceClient } from './resources/tabgroup.js';
import { TableResourceClient } from './resources/table.js';
import { TextAreaResourceClient } from './resources/textarea.js';
import { TextFieldResourceClient } from './resources/textfield.js';
import { ToolbarResourceClient } from './resources/toolbar.js';
import { UIElementResourceClient } from './resources/uielement.js';
import { ValueIndicatorResourceClient } from './resources/valueindicator.js';
import { PropertyListItemResourceClient } from './resources/propertylistitem.js';
import { XMLAttributeResourceClient } from './resources/xmlattribute.js';
import { XMLDataResourceClient } from './resources/xmldata.js';
import { XMLElementResourceClient } from './resources/xmlelement.js';
import { ScriptingClassResourceClient } from './resources/scriptingclass.js';
import { ScriptingCommandResourceClient } from './resources/scriptingcommand.js';
import { ScriptingDefinitionObjectResourceClient } from './resources/scriptingdefinitionobject.js';
import { ScriptingElementResourceClient } from './resources/scriptingelement.js';
import { ScriptingEnumerationResourceClient } from './resources/scriptingenumeration.js';
import { ScriptingEnumeratorResourceClient } from './resources/scriptingenumerator.js';
import { ScriptingParameterResourceClient } from './resources/scriptingparameter.js';
import { ScriptingPropertyResourceClient } from './resources/scriptingproperty.js';
import { ScriptingSuiteResourceClient } from './resources/scriptingsuite.js';


/**
 * Client configuration options.
 */
export interface SystemEventsClientOptions {
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
      const code = error.error?.code ?? 'UNKNOWN_ERROR';
      const message = error.error?.message ?? `HTTP ${String(response.status)}`;
      throw new SystemEventsError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for SystemEvents API errors.
 */
export class SystemEventsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SystemEventsError';
    this.code = code;
  }
}

/**
 * SystemEvents client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new SystemEventsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class SystemEventsClient {
  readonly #httpClient: HttpClient;

  /** A collection of settings for configuring a connection */
  readonly configurations: ConfigurationResourceClient;

  /** A collection of settings for a network interface */
  readonly interfaces: InterfaceResourceClient;

  /** A set of services */
  readonly locations: LocationResourceClient;

  /** the preferences for the current user's network */
  readonly networkpreferencesobjects: NetworkPreferencesObjectResourceClient;

  /** A collection of settings for a network service */
  readonly services: ServiceResourceClient;

  /** An alias in the file system */
  readonly aliases: AliasResourceClient;

  /** The Classic domain in the file system */
  readonly classicdomainobjects: ClassicDomainObjectResourceClient;

  /** A disk in the file system */
  readonly disks: DiskResourceClient;

  /** An item stored in the file system */
  readonly diskitems: DiskItemResourceClient;

  /** A domain in the file system */
  readonly domains: DomainResourceClient;

  /** A file in the file system */
  readonly files: FileResourceClient;

  /** A file package in the file system */
  readonly filepackages: FilePackageResourceClient;

  /** A folder in the file system */
  readonly folders: FolderResourceClient;

  /** The local domain in the file system */
  readonly localdomainobjects: LocalDomainObjectResourceClient;

  /** The network domain in the file system */
  readonly networkdomainobjects: NetworkDomainObjectResourceClient;

  /** The system domain in the file system */
  readonly systemdomainobjects: SystemDomainObjectResourceClient;

  /** The user domain in the file system */
  readonly userdomainobjects: UserDomainObjectResourceClient;

  /** An action that can be performed on the UI element */
  readonly actions: ActionResourceClient;

  /** An named data value associated with the UI element */
  readonly attributes: AttributeResourceClient;

  /** A browser belonging to a window */
  readonly browsers: BrowserResourceClient;

  /** A busy indicator belonging to a window */
  readonly busyindicators: BusyIndicatorResourceClient;

  /** A button belonging to a window or scroll bar */
  readonly buttons: ButtonResourceClient;

  /** A checkbox belonging to a window */
  readonly checkboxes: CheckboxResourceClient;

  /** A color well belonging to a window */
  readonly colorwells: ColorWellResourceClient;

  /** A column belonging to a table */
  readonly columns: ColumnResourceClient;

  /** A combo box belonging to a window */
  readonly comboboxes: ComboBoxResourceClient;

  /** A drawer that may be extended from a window */
  readonly drawers: DrawerResourceClient;

  /** A group belonging to a window */
  readonly groups: GroupResourceClient;

  /** A grow area belonging to a window */
  readonly growareas: GrowAreaResourceClient;

  /** An image belonging to a static text field */
  readonly images: ImageResourceClient;

  /** A incrementor belonging to a window */
  readonly incrementors: IncrementorResourceClient;

  /** A list belonging to a window */
  readonly lists: ListResourceClient;

  /** A menu belonging to a menu bar item */
  readonly menus: MenuResourceClient;

  /** A menu bar belonging to a process */
  readonly menubars: MenuBarResourceClient;

  /** A menu bar item belonging to a menu bar */
  readonly menubaritems: MenuBarItemResourceClient;

  /** A menu button belonging to a window */
  readonly menubuttons: MenuButtonResourceClient;

  /** A menu item belonging to a menu */
  readonly menuitems: MenuItemResourceClient;

  /** A outline belonging to a window */
  readonly outlines: OutlineResourceClient;

  /** A pop over belonging to a window */
  readonly popovers: PopOverResourceClient;

  /** A pop up button belonging to a window */
  readonly popupbuttons: PopUpButtonResourceClient;

  /** A process running on this computer */
  readonly processes: ProcessResourceClient;

  /** A progress indicator belonging to a window */
  readonly progressindicators: ProgressIndicatorResourceClient;

  /** A radio button belonging to a window */
  readonly radiobuttons: RadioButtonResourceClient;

  /** A radio button group belonging to a window */
  readonly radiogroups: RadioGroupResourceClient;

  /** A relevance indicator belonging to a window */
  readonly relevanceindicators: RelevanceIndicatorResourceClient;

  /** A row belonging to a table */
  readonly rows: RowResourceClient;

  /** A scroll area belonging to a window */
  readonly scrollareas: ScrollAreaResourceClient;

  /** A scroll bar belonging to a window */
  readonly scrollbars: ScrollBarResourceClient;

  /** A sheet displayed over a window */
  readonly sheets: SheetResourceClient;

  /** A slider belonging to a window */
  readonly sliders: SliderResourceClient;

  /** A splitter belonging to a window */
  readonly splitters: SplitterResourceClient;

  /** A splitter group belonging to a window */
  readonly splittergroups: SplitterGroupResourceClient;

  /** A static text field belonging to a window */
  readonly statictexts: StaticTextResourceClient;

  /** A tab group belonging to a window */
  readonly tabgroups: TabGroupResourceClient;

  /** A table belonging to a window */
  readonly tables: TableResourceClient;

  /** A text area belonging to a window */
  readonly textareas: TextAreaResourceClient;

  /** A text field belonging to a window */
  readonly textfields: TextFieldResourceClient;

  /** A toolbar belonging to a window */
  readonly toolbars: ToolbarResourceClient;

  /** A piece of the user interface of a process */
  readonly uielements: UIElementResourceClient;

  /** A value indicator ( thumb or slider ) belonging to a scroll bar */
  readonly valueindicators: ValueIndicatorResourceClient;

  /** A unit of data in Property List format */
  readonly propertylistitems: PropertyListItemResourceClient;

  /** A named value associated with a unit of data in XML format */
  readonly xmlattributes: XMLAttributeResourceClient;

  /** Data in XML format */
  readonly xmldatas: XMLDataResourceClient;

  /** A unit of data in XML format */
  readonly xmlelements: XMLElementResourceClient;

  /** A class within a suite within a scripting definition */
  readonly scriptingclasses: ScriptingClassResourceClient;

  /** A command within a suite within a scripting definition */
  readonly scriptingcommands: ScriptingCommandResourceClient;

  /** The scripting definition of the System Events applicaation */
  readonly scriptingdefinitionobjects: ScriptingDefinitionObjectResourceClient;

  /** An element within a class within a suite within a scripting definition */
  readonly scriptingelements: ScriptingElementResourceClient;

  /** An enumeration within a suite within a scripting definition */
  readonly scriptingenumerations: ScriptingEnumerationResourceClient;

  /** An enumerator within an enumeration within a suite within a scripting definition */
  readonly scriptingenumerators: ScriptingEnumeratorResourceClient;

  /** A parameter within a command within a suite within a scripting definition */
  readonly scriptingparameters: ScriptingParameterResourceClient;

  /** A property within a class within a suite within a scripting definition */
  readonly scriptingproperties: ScriptingPropertyResourceClient;

  /** A suite within a scripting definition */
  readonly scriptingsuites: ScriptingSuiteResourceClient;

  constructor(options: SystemEventsClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.configurations = new ConfigurationResourceClient(this.#httpClient, 'system-events', 'configurations');
    this.interfaces = new InterfaceResourceClient(this.#httpClient, 'system-events', 'interfaces');
    this.locations = new LocationResourceClient(this.#httpClient, 'system-events', 'locations');
    this.networkpreferencesobjects = new NetworkPreferencesObjectResourceClient(this.#httpClient, 'system-events', 'networkpreferencesobjects');
    this.services = new ServiceResourceClient(this.#httpClient, 'system-events', 'services');
    this.aliases = new AliasResourceClient(this.#httpClient, 'system-events', 'aliases');
    this.classicdomainobjects = new ClassicDomainObjectResourceClient(this.#httpClient, 'system-events', 'classicdomainobjects');
    this.disks = new DiskResourceClient(this.#httpClient, 'system-events', 'disks');
    this.diskitems = new DiskItemResourceClient(this.#httpClient, 'system-events', 'diskitems');
    this.domains = new DomainResourceClient(this.#httpClient, 'system-events', 'domains');
    this.files = new FileResourceClient(this.#httpClient, 'system-events', 'files');
    this.filepackages = new FilePackageResourceClient(this.#httpClient, 'system-events', 'filepackages');
    this.folders = new FolderResourceClient(this.#httpClient, 'system-events', 'folders');
    this.localdomainobjects = new LocalDomainObjectResourceClient(this.#httpClient, 'system-events', 'localdomainobjects');
    this.networkdomainobjects = new NetworkDomainObjectResourceClient(this.#httpClient, 'system-events', 'networkdomainobjects');
    this.systemdomainobjects = new SystemDomainObjectResourceClient(this.#httpClient, 'system-events', 'systemdomainobjects');
    this.userdomainobjects = new UserDomainObjectResourceClient(this.#httpClient, 'system-events', 'userdomainobjects');
    this.actions = new ActionResourceClient(this.#httpClient, 'system-events', 'actions');
    this.attributes = new AttributeResourceClient(this.#httpClient, 'system-events', 'attributes');
    this.browsers = new BrowserResourceClient(this.#httpClient, 'system-events', 'browsers');
    this.busyindicators = new BusyIndicatorResourceClient(this.#httpClient, 'system-events', 'busyindicators');
    this.buttons = new ButtonResourceClient(this.#httpClient, 'system-events', 'buttons');
    this.checkboxes = new CheckboxResourceClient(this.#httpClient, 'system-events', 'checkboxes');
    this.colorwells = new ColorWellResourceClient(this.#httpClient, 'system-events', 'colorwells');
    this.columns = new ColumnResourceClient(this.#httpClient, 'system-events', 'columns');
    this.comboboxes = new ComboBoxResourceClient(this.#httpClient, 'system-events', 'comboboxes');
    this.drawers = new DrawerResourceClient(this.#httpClient, 'system-events', 'drawers');
    this.groups = new GroupResourceClient(this.#httpClient, 'system-events', 'groups');
    this.growareas = new GrowAreaResourceClient(this.#httpClient, 'system-events', 'growareas');
    this.images = new ImageResourceClient(this.#httpClient, 'system-events', 'images');
    this.incrementors = new IncrementorResourceClient(this.#httpClient, 'system-events', 'incrementors');
    this.lists = new ListResourceClient(this.#httpClient, 'system-events', 'lists');
    this.menus = new MenuResourceClient(this.#httpClient, 'system-events', 'menus');
    this.menubars = new MenuBarResourceClient(this.#httpClient, 'system-events', 'menubars');
    this.menubaritems = new MenuBarItemResourceClient(this.#httpClient, 'system-events', 'menubaritems');
    this.menubuttons = new MenuButtonResourceClient(this.#httpClient, 'system-events', 'menubuttons');
    this.menuitems = new MenuItemResourceClient(this.#httpClient, 'system-events', 'menuitems');
    this.outlines = new OutlineResourceClient(this.#httpClient, 'system-events', 'outlines');
    this.popovers = new PopOverResourceClient(this.#httpClient, 'system-events', 'popovers');
    this.popupbuttons = new PopUpButtonResourceClient(this.#httpClient, 'system-events', 'popupbuttons');
    this.processes = new ProcessResourceClient(this.#httpClient, 'system-events', 'processes');
    this.progressindicators = new ProgressIndicatorResourceClient(this.#httpClient, 'system-events', 'progressindicators');
    this.radiobuttons = new RadioButtonResourceClient(this.#httpClient, 'system-events', 'radiobuttons');
    this.radiogroups = new RadioGroupResourceClient(this.#httpClient, 'system-events', 'radiogroups');
    this.relevanceindicators = new RelevanceIndicatorResourceClient(this.#httpClient, 'system-events', 'relevanceindicators');
    this.rows = new RowResourceClient(this.#httpClient, 'system-events', 'rows');
    this.scrollareas = new ScrollAreaResourceClient(this.#httpClient, 'system-events', 'scrollareas');
    this.scrollbars = new ScrollBarResourceClient(this.#httpClient, 'system-events', 'scrollbars');
    this.sheets = new SheetResourceClient(this.#httpClient, 'system-events', 'sheets');
    this.sliders = new SliderResourceClient(this.#httpClient, 'system-events', 'sliders');
    this.splitters = new SplitterResourceClient(this.#httpClient, 'system-events', 'splitters');
    this.splittergroups = new SplitterGroupResourceClient(this.#httpClient, 'system-events', 'splittergroups');
    this.statictexts = new StaticTextResourceClient(this.#httpClient, 'system-events', 'statictexts');
    this.tabgroups = new TabGroupResourceClient(this.#httpClient, 'system-events', 'tabgroups');
    this.tables = new TableResourceClient(this.#httpClient, 'system-events', 'tables');
    this.textareas = new TextAreaResourceClient(this.#httpClient, 'system-events', 'textareas');
    this.textfields = new TextFieldResourceClient(this.#httpClient, 'system-events', 'textfields');
    this.toolbars = new ToolbarResourceClient(this.#httpClient, 'system-events', 'toolbars');
    this.uielements = new UIElementResourceClient(this.#httpClient, 'system-events', 'uielements');
    this.valueindicators = new ValueIndicatorResourceClient(this.#httpClient, 'system-events', 'valueindicators');
    this.propertylistitems = new PropertyListItemResourceClient(this.#httpClient, 'system-events', 'propertylistitems');
    this.xmlattributes = new XMLAttributeResourceClient(this.#httpClient, 'system-events', 'xmlattributes');
    this.xmldatas = new XMLDataResourceClient(this.#httpClient, 'system-events', 'xmldatas');
    this.xmlelements = new XMLElementResourceClient(this.#httpClient, 'system-events', 'xmlelements');
    this.scriptingclasses = new ScriptingClassResourceClient(this.#httpClient, 'system-events', 'scriptingclasses');
    this.scriptingcommands = new ScriptingCommandResourceClient(this.#httpClient, 'system-events', 'scriptingcommands');
    this.scriptingdefinitionobjects = new ScriptingDefinitionObjectResourceClient(this.#httpClient, 'system-events', 'scriptingdefinitionobjects');
    this.scriptingelements = new ScriptingElementResourceClient(this.#httpClient, 'system-events', 'scriptingelements');
    this.scriptingenumerations = new ScriptingEnumerationResourceClient(this.#httpClient, 'system-events', 'scriptingenumerations');
    this.scriptingenumerators = new ScriptingEnumeratorResourceClient(this.#httpClient, 'system-events', 'scriptingenumerators');
    this.scriptingparameters = new ScriptingParameterResourceClient(this.#httpClient, 'system-events', 'scriptingparameters');
    this.scriptingproperties = new ScriptingPropertyResourceClient(this.#httpClient, 'system-events', 'scriptingproperties');
    this.scriptingsuites = new ScriptingSuiteResourceClient(this.#httpClient, 'system-events', 'scriptingsuites');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Discard the results of a bounded update session with one or more files.
   */
  async abortTransaction(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.abortTransaction', {});
  }


  /**
   * Begin a bounded update session with one or more files.
   */
  async beginTransaction(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.beginTransaction', {});
  }


  /**
   * Apply the results of a bounded update session with one or more files.
   */
  async endTransaction(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.endTransaction', {});
  }


  /**
   * connect a configuration or service
   */
  async connect(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.connect', {});
  }


  /**
   * disconnect a configuration or service
   */
  async disconnect(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.disconnect', {});
  }


  /**
   * start the screen saver
   */
  async start(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.start', {});
  }


  /**
   * stop the screen saver
   */
  async stop(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.stop', {});
  }


  /**
   * Move disk item(s) to a new location.
   */
  async move(to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.move', { to });
  }


  /**
   * Open disk item(s) with the appropriate application.
   */
  async open(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.open', {});
  }


  /**
   * Log out the current user
   */
  async logOut(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.logOut', {});
  }


  /**
   * Restart the computer
   */
  async restart(stateSavingPreference?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.restart', { stateSavingPreference });
  }


  /**
   * Shut Down the computer
   */
  async shutDown(stateSavingPreference?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.shutDown', { stateSavingPreference });
  }


  /**
   * Put the computer to sleep
   */
  async sleep(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.sleep', {});
  }


  /**
   * cause the target process to behave as if key codes were entered
   */
  async keyCode(using?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.keyCode', { using });
  }


  /**
   * cause the target process to behave as if keystrokes were entered
   */
  async keystroke(using?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.keystroke', { using });
  }


  /**
   * Attach an action to a folder
   */
  async attachActionTo(using: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.attachActionTo', { using });
  }


  /**
   * List the actions attached to a folder
   */
  async attachedScripts(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.attachedScripts', {});
  }


  /**
   * cause the target process to behave as if the UI element were cancelled
   */
  async cancel(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.cancel', {});
  }


  /**
   * cause the target process to behave as if the UI element were confirmed
   */
  async confirm(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.confirm', {});
  }


  /**
   * cause the target process to behave as if the UI element were decremented
   */
  async decrement(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.decrement', {});
  }


  /**
   * Send a folder action code to a folder action script
   */
  async doFolderAction(folderActionCode: string, withItemList?: unknown, withWindowSize?: { x: number; y: number; width: number; height: number }): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.doFolderAction', { folderActionCode, withItemList, withWindowSize });
  }


  /**
   * Edit an action of a folder
   */
  async editActionOf(usingActionName?: string, usingActionNumber?: number): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.editActionOf', { usingActionName, usingActionNumber });
  }


  /**
   * cause the target process to behave as if the UI element were incremented
   */
  async increment(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.increment', {});
  }


  /**
   * cause the target process to behave as if keys were held down
   */
  async keyDown(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.keyDown', {});
  }


  /**
   * cause the target process to behave as if keys were released
   */
  async keyUp(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.keyUp', {});
  }


  /**
   * cause the target process to behave as if the UI element were picked
   */
  async pick(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.pick', {});
  }


  /**
   * Remove a folder action from a folder
   */
  async removeActionFrom(usingActionName?: string, usingActionNumber?: number): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-events.app.removeActionFrom', { usingActionName, usingActionNumber });
  }
}
