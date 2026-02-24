/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** SaveableFileFormat */
export type SaveableFileFormat = 'text';

/** ScrollPageBehaviors */
export type ScrollPageBehaviors = 'jumpToHere' | 'jumpToNextPage';

/** FontSmoothingStyles */
export type FontSmoothingStyles = 'automatic' | 'light' | 'medium' | 'standard' | 'strong';

/** Appearances */
export type Appearances = 'blue' | 'graphite';

/** HighlightColors */
export type HighlightColors = 'blue' | 'gold' | 'graphite' | 'green' | 'orange' | 'purple' | 'red' | 'silver';

/** Dhac */
export type Dhac = 'askWhatToDo' | 'ignore' | 'openApplication' | 'runAScript';

/** DynamicStyle */
export type DynamicStyle = 'auto' | 'dynamic' | 'light' | 'dark' | 'unknown';

/** Dpls */
export type Dpls = 'bottom' | 'left' | 'right';

/** Dpef */
export type Dpef = 'genie' | 'scale';

/** Dpbh */
export type Dpbh = 'minimize' | 'off' | 'zoom';

/** Edfm */
export type Edfm = 'applePhotoFormat' | 'appleShareFormat' | 'audioFormat' | 'highSierraFormat' | '9660' | 'macOSExtendedFormat' | 'macOSFormat' | 'mSDOSFormat' | 'nFSFormat' | 'proDOSFormat' | 'quickTakeFormat' | 'uDFFormat' | 'uFSFormat' | 'unknownFormat' | 'webDAVFormat';

/** EMds */
export type EMds = 'commandDown' | 'controlDown' | 'optionDown' | 'shiftDown';

/** EMky */
export type EMky = 'command' | 'control' | 'option' | 'shift';

/** Enum */
export type Enum = 'standard' | 'detailed';

/** Actn */
export type Actn = 'itemsAdded' | 'itemsRemoved' | 'windowClosed' | 'windowMoved' | 'windowOpened';

/** Accs */
export type Accs = 'none' | 'readOnly' | 'readWrite' | 'writeOnly';

/** A collection of settings for configuring a connection */
export interface Configuration {
  /** the name used to authenticate */
  accountName: string;
  /** Is the configuration connected? */
  connected: boolean;
  /** the unique identifier for the configuration */
  id: string;
  /** the name of the configuration */
  name: string;
}

/** Input for creating a Configuration */
export interface ConfigurationCreateInput {
  /** the name used to authenticate */
  accountName?: string;
}

/** Input for updating a Configuration */
export type ConfigurationUpdateInput = Partial<ConfigurationCreateInput>;

/** A collection of settings for a network interface */
export interface Interface {
  /** configure the interface speed, duplex, and mtu automatically? */
  automatic: boolean;
  /** the duplex setting  half | full | full with flow control */
  duplex: string;
  /** the unique identifier for the interface */
  id: string;
  /** the type of interface */
  kind: string;
  /** the MAC address for the interface */
  mACAddress: string;
  /** the packet size */
  mtu: number;
  /** the name of the interface */
  name: string;
  /** ethernet speed 10 | 100 | 1000 */
  speed: number;
}

/** Input for creating a Interface */
export interface InterfaceCreateInput {
  /** configure the interface speed, duplex, and mtu automatically? */
  automatic?: boolean;
  /** the duplex setting  half | full | full with flow control */
  duplex?: string;
  /** the packet size */
  mtu?: number;
  /** ethernet speed 10 | 100 | 1000 */
  speed?: number;
}

/** Input for updating a Interface */
export type InterfaceUpdateInput = Partial<InterfaceCreateInput>;

/** A set of services */
export interface Location {
  /** the unique identifier for the location */
  id: string;
  /** the name of the location */
  name: string;
}

/** Input for creating a Location */
export interface LocationCreateInput {
  /** the name of the location */
  name?: string;
}

/** Input for updating a Location */
export type LocationUpdateInput = Partial<LocationCreateInput>;

/** the preferences for the current user's network */
export interface NetworkPreferencesObject {
  /** the current location */
  currentLocation: Location;
}

/** Input for creating a NetworkPreferencesObject */
export interface NetworkPreferencesObjectCreateInput {
  /** the current location */
  currentLocation?: Location;
}

/** Input for updating a NetworkPreferencesObject */
export type NetworkPreferencesObjectUpdateInput = Partial<NetworkPreferencesObjectCreateInput>;

/** A collection of settings for a network service */
export interface Service {
  /** Is the service active? */
  active: boolean;
  /** the currently selected configuration */
  currentConfiguration: Configuration;
  /** the unique identifier for the service */
  id: string;
  /** the interface the service is built on */
  interface: Interface;
  /** the type of service */
  kind: number;
  /** the name of the service */
  name: string;
}

/** Input for creating a Service */
export interface ServiceCreateInput {
  /** the currently selected configuration */
  currentConfiguration?: Configuration;
  /** the name of the service */
  name?: string;
}

/** Input for updating a Service */
export type ServiceUpdateInput = Partial<ServiceCreateInput>;

/** An alias in the file system */
export interface Alias {
  /** the OSType identifying the application that created the alias */
  creatorType: string;
  /** the application that will launch if the alias is opened */
  defaultApplication: string;
  /** the OSType identifying the type of data contained in the alias */
  fileType: string;
  /** The kind of alias, as shown in Finder */
  kind: string;
  /** the version of the product (visible at the top of the "Get Info" window) */
  productVersion: string;
  /** the short version of the application bundle referenced by the alias */
  shortVersion: string;
  /** Is the alias a stationery pad? */
  stationery: boolean;
  /** The type identifier of the alias */
  typeIdentifier: string;
  /** the version of the application bundle referenced by the alias (visible at the bottom of the "Get Info" window) */
  version: string;
}

/** Input for creating a Alias */
export interface AliasCreateInput {
  /** the OSType identifying the application that created the alias */
  creatorType?: string;
  /** the application that will launch if the alias is opened */
  defaultApplication?: string;
  /** the OSType identifying the type of data contained in the alias */
  fileType?: string;
  /** Is the alias a stationery pad? */
  stationery?: boolean;
}

/** Input for updating a Alias */
export type AliasUpdateInput = Partial<AliasCreateInput>;

/** The Classic domain in the file system */
export interface ClassicDomainObject {
  /** The Apple Menu Items folder */
  appleMenuFolder: Folder;
  /** The Control Panels folder */
  controlPanelsFolder: Folder;
  /** The Control Strip Modules folder */
  controlStripModulesFolder: Folder;
  /** The Classic Desktop folder */
  desktopFolder: Folder;
  /** The Extensions folder */
  extensionsFolder: Folder;
  /** The Fonts folder */
  fontsFolder: Folder;
  /** The Launcher Items folder */
  launcherItemsFolder: Folder;
  /** The Classic Preferences folder */
  preferencesFolder: Folder;
  /** The Shutdown Items folder */
  shutdownFolder: Folder;
  /** The StartupItems folder */
  startupItemsFolder: Folder;
  /** The System folder */
  systemFolder: Folder;
}

/** Input for creating a ClassicDomainObject */
export type ClassicDomainObjectCreateInput = Record<string, never>;

/** Input for updating a ClassicDomainObject */
export type ClassicDomainObjectUpdateInput = Partial<ClassicDomainObjectCreateInput>;

/** A disk in the file system */
export interface Disk {
  /** the total number of bytes (free or used) on the disk */
  capacity: number;
  /** Can the media be ejected (floppies, CD's, and so on)? */
  ejectable: boolean;
  /** the file system format of this disk */
  format: string;
  /** the number of free bytes left on the disk */
  freeSpace: number;
  /** Ignore permissions on this disk? */
  ignorePrivileges: boolean;
  /** Is the media a local volume (as opposed to a file server)? */
  localVolume: boolean;
  /** the server on which the disk resides, AFP volumes only */
  server: string;
  /** Is this disk the boot disk? */
  startup: boolean;
  /** the zone in which the disk's server resides, AFP volumes only */
  zone: string;
}

/** Input for creating a Disk */
export interface DiskCreateInput {
  /** Ignore permissions on this disk? */
  ignorePrivileges?: boolean;
}

/** Input for updating a Disk */
export type DiskUpdateInput = Partial<DiskCreateInput>;

/** An item stored in the file system */
export interface DiskItem {
  /** Is the disk item busy? */
  busyStatus: boolean;
  /** the folder or disk which has this disk item as an element */
  container: unknown;
  /** the date on which the disk item was created */
  creationDate: Date;
  /** the name of the disk item as displayed in the User Interface */
  displayedName: string;
  /** the unique ID of the disk item */
  id: string;
  /** the date on which the disk item was last modified */
  modificationDate: Date;
  /** the name of the disk item */
  name: string;
  /** the extension portion of the name */
  nameExtension: string;
  /** Is the disk item a package? */
  packageFolder: boolean;
  /** the file system path of the disk item */
  path: string;
  /** the actual space used by the disk item on disk */
  physicalSize: number;
  /** the POSIX file system path of the disk item */
  pOSIXPath: string;
  /** the logical size of the disk item */
  size: number;
  /** the URL of the disk item */
  uRL: string;
  /** Is the disk item visible? */
  visible: boolean;
  /** the volume on which the disk item resides */
  volume: string;
}

/** Input for creating a DiskItem */
export interface DiskItemCreateInput {
  /** the date on which the disk item was last modified */
  modificationDate?: Date;
  /** the name of the disk item */
  name?: string;
  /** Is the disk item visible? */
  visible?: boolean;
}

/** Input for updating a DiskItem */
export type DiskItemUpdateInput = Partial<DiskItemCreateInput>;

/** A domain in the file system */
export interface Domain {
  /** The Application Support folder */
  applicationSupportFolder: Folder;
  /** The Applications folder */
  applicationsFolder: Folder;
  /** The Desktop Pictures folder */
  desktopPicturesFolder: Folder;
  /** The Folder Action Scripts folder */
  folderActionScriptsFolder: Folder;
  /** The Fonts folder */
  fontsFolder: Folder;
  /** the unique identifier of the domain */
  id: string;
  /** The Library folder */
  libraryFolder: Folder;
  /** the name of the domain */
  name: string;
  /** The Preferences folder */
  preferencesFolder: Folder;
  /** The Scripting Additions folder */
  scriptingAdditionsFolder: Folder;
  /** The Scripts folder */
  scriptsFolder: Folder;
  /** The Shared Documents folder */
  sharedDocumentsFolder: Folder;
  /** The Speakable Items folder */
  speakableItemsFolder: Folder;
  /** The Utilities folder */
  utilitiesFolder: Folder;
  /** The Automator Workflows folder */
  workflowsFolder: Folder;
}

/** Input for creating a Domain */
export type DomainCreateInput = Record<string, never>;

/** Input for updating a Domain */
export type DomainUpdateInput = Partial<DomainCreateInput>;

/** A file in the file system */
export interface File {
  /** the OSType identifying the application that created the file */
  creatorType: string;
  /** the application that will launch if the file is opened */
  defaultApplication: string;
  /** the OSType identifying the type of data contained in the file */
  fileType: string;
  /** The kind of file, as shown in Finder */
  kind: string;
  /** the version of the product (visible at the top of the "Get Info" window) */
  productVersion: string;
  /** the short version of the file */
  shortVersion: string;
  /** Is the file a stationery pad? */
  stationery: boolean;
  /** The type identifier of the file */
  typeIdentifier: string;
  /** the version of the file (visible at the bottom of the "Get Info" window) */
  version: string;
}

/** Input for creating a File */
export interface FileCreateInput {
  /** the OSType identifying the application that created the file */
  creatorType?: string;
  /** the application that will launch if the file is opened */
  defaultApplication?: string;
  /** the OSType identifying the type of data contained in the file */
  fileType?: string;
  /** Is the file a stationery pad? */
  stationery?: boolean;
}

/** Input for updating a File */
export type FileUpdateInput = Partial<FileCreateInput>;

/** A file package in the file system */
export interface FilePackage {
  /** Unique identifier for this package */
  id: string;
}

/** Input for creating a FilePackage */
export type FilePackageCreateInput = Record<string, never>;

/** Input for updating a FilePackage */
export type FilePackageUpdateInput = Partial<FilePackageCreateInput>;

/** A folder in the file system */
export interface Folder {
  /** Unique identifier for this folder */
  id: string;
}

/** Input for creating a Folder */
export type FolderCreateInput = Record<string, never>;

/** Input for updating a Folder */
export type FolderUpdateInput = Partial<FolderCreateInput>;

/** The local domain in the file system */
export interface LocalDomainObject {
  /** Unique identifier for this domain */
  id: string;
}

/** Input for creating a LocalDomainObject */
export type LocalDomainObjectCreateInput = Record<string, never>;

/** Input for updating a LocalDomainObject */
export type LocalDomainObjectUpdateInput = Partial<LocalDomainObjectCreateInput>;

/** The network domain in the file system */
export interface NetworkDomainObject {
  /** Unique identifier for this domain */
  id: string;
}

/** Input for creating a NetworkDomainObject */
export type NetworkDomainObjectCreateInput = Record<string, never>;

/** Input for updating a NetworkDomainObject */
export type NetworkDomainObjectUpdateInput = Partial<NetworkDomainObjectCreateInput>;

/** The system domain in the file system */
export interface SystemDomainObject {
  /** Unique identifier for this domain */
  id: string;
}

/** Input for creating a SystemDomainObject */
export type SystemDomainObjectCreateInput = Record<string, never>;

/** Input for updating a SystemDomainObject */
export type SystemDomainObjectUpdateInput = Partial<SystemDomainObjectCreateInput>;

/** The user domain in the file system */
export interface UserDomainObject {
  /** The user's Desktop folder */
  desktopFolder: Folder;
  /** The user's Documents folder */
  documentsFolder: Folder;
  /** The user's Downloads folder */
  downloadsFolder: Folder;
  /** The user's Favorites folder */
  favoritesFolder: Folder;
  /** The user's Home folder */
  homeFolder: Folder;
  /** The user's Movies folder */
  moviesFolder: Folder;
  /** The user's Music folder */
  musicFolder: Folder;
  /** The user's Pictures folder */
  picturesFolder: Folder;
  /** The user's Public folder */
  publicFolder: Folder;
  /** The user's Sites folder */
  sitesFolder: Folder;
  /** The Temporary Items folder */
  temporaryItemsFolder: Folder;
}

/** Input for creating a UserDomainObject */
export type UserDomainObjectCreateInput = Record<string, never>;

/** Input for updating a UserDomainObject */
export type UserDomainObjectUpdateInput = Partial<UserDomainObjectCreateInput>;

/** An action that can be performed on the UI element */
export interface Action {
  /** what the action does */
  description: string;
  /** the name of the action */
  name: string;
}

/** Input for creating a Action */
export type ActionCreateInput = Record<string, never>;

/** Input for updating a Action */
export type ActionUpdateInput = Partial<ActionCreateInput>;

/** An named data value associated with the UI element */
export interface Attribute {
  /** the name of the attribute */
  name: string;
  /** Can the attribute be set? */
  settable: boolean;
  /** the current value of the attribute */
  value: string;
}

/** Input for creating a Attribute */
export interface AttributeCreateInput {
  /** the current value of the attribute */
  value?: string;
}

/** Input for updating a Attribute */
export type AttributeUpdateInput = Partial<AttributeCreateInput>;

/** A browser belonging to a window */
export interface Browser {
  /** Unique identifier for this browser */
  id: string;
}

/** Input for creating a Browser */
export type BrowserCreateInput = Record<string, never>;

/** Input for updating a Browser */
export type BrowserUpdateInput = Partial<BrowserCreateInput>;

/** A busy indicator belonging to a window */
export interface BusyIndicator {
  /** Unique identifier for this busy indicator */
  id: string;
}

/** Input for creating a BusyIndicator */
export type BusyIndicatorCreateInput = Record<string, never>;

/** Input for updating a BusyIndicator */
export type BusyIndicatorUpdateInput = Partial<BusyIndicatorCreateInput>;

/** A button belonging to a window or scroll bar */
export interface Button {
  /** Unique identifier for this button */
  id: string;
}

/** Input for creating a Button */
export type ButtonCreateInput = Record<string, never>;

/** Input for updating a Button */
export type ButtonUpdateInput = Partial<ButtonCreateInput>;

/** A checkbox belonging to a window */
export interface Checkbox {
  /** Unique identifier for this checkbox */
  id: string;
}

/** Input for creating a Checkbox */
export type CheckboxCreateInput = Record<string, never>;

/** Input for updating a Checkbox */
export type CheckboxUpdateInput = Partial<CheckboxCreateInput>;

/** A color well belonging to a window */
export interface ColorWell {
  /** Unique identifier for this color well */
  id: string;
}

/** Input for creating a ColorWell */
export type ColorWellCreateInput = Record<string, never>;

/** Input for updating a ColorWell */
export type ColorWellUpdateInput = Partial<ColorWellCreateInput>;

/** A column belonging to a table */
export interface Column {
  /** Unique identifier for this column */
  id: string;
}

/** Input for creating a Column */
export type ColumnCreateInput = Record<string, never>;

/** Input for updating a Column */
export type ColumnUpdateInput = Partial<ColumnCreateInput>;

/** A combo box belonging to a window */
export interface ComboBox {
  /** Unique identifier for this combo box */
  id: string;
}

/** Input for creating a ComboBox */
export type ComboBoxCreateInput = Record<string, never>;

/** Input for updating a ComboBox */
export type ComboBoxUpdateInput = Partial<ComboBoxCreateInput>;

/** A drawer that may be extended from a window */
export interface Drawer {
  /** Unique identifier for this drawer */
  id: string;
}

/** Input for creating a Drawer */
export type DrawerCreateInput = Record<string, never>;

/** Input for updating a Drawer */
export type DrawerUpdateInput = Partial<DrawerCreateInput>;

/** A group belonging to a window */
export interface Group {
  /** Unique identifier for this group */
  id: string;
}

/** Input for creating a Group */
export type GroupCreateInput = Record<string, never>;

/** Input for updating a Group */
export type GroupUpdateInput = Partial<GroupCreateInput>;

/** A grow area belonging to a window */
export interface GrowArea {
  /** Unique identifier for this grow area */
  id: string;
}

/** Input for creating a GrowArea */
export type GrowAreaCreateInput = Record<string, never>;

/** Input for updating a GrowArea */
export type GrowAreaUpdateInput = Partial<GrowAreaCreateInput>;

/** An image belonging to a static text field */
export interface Image {
  /** Unique identifier for this image */
  id: string;
}

/** Input for creating a Image */
export type ImageCreateInput = Record<string, never>;

/** Input for updating a Image */
export type ImageUpdateInput = Partial<ImageCreateInput>;

/** A incrementor belonging to a window */
export interface Incrementor {
  /** Unique identifier for this incrementor */
  id: string;
}

/** Input for creating a Incrementor */
export type IncrementorCreateInput = Record<string, never>;

/** Input for updating a Incrementor */
export type IncrementorUpdateInput = Partial<IncrementorCreateInput>;

/** A list belonging to a window */
export interface List {
  /** Unique identifier for this list */
  id: string;
}

/** Input for creating a List */
export type ListCreateInput = Record<string, never>;

/** Input for updating a List */
export type ListUpdateInput = Partial<ListCreateInput>;

/** A menu belonging to a menu bar item */
export interface Menu {
  /** Unique identifier for this menu */
  id: string;
}

/** Input for creating a Menu */
export type MenuCreateInput = Record<string, never>;

/** Input for updating a Menu */
export type MenuUpdateInput = Partial<MenuCreateInput>;

/** A menu bar belonging to a process */
export interface MenuBar {
  /** Unique identifier for this menu bar */
  id: string;
}

/** Input for creating a MenuBar */
export type MenuBarCreateInput = Record<string, never>;

/** Input for updating a MenuBar */
export type MenuBarUpdateInput = Partial<MenuBarCreateInput>;

/** A menu bar item belonging to a menu bar */
export interface MenuBarItem {
  /** Unique identifier for this menu bar item */
  id: string;
}

/** Input for creating a MenuBarItem */
export type MenuBarItemCreateInput = Record<string, never>;

/** Input for updating a MenuBarItem */
export type MenuBarItemUpdateInput = Partial<MenuBarItemCreateInput>;

/** A menu button belonging to a window */
export interface MenuButton {
  /** Unique identifier for this menu button */
  id: string;
}

/** Input for creating a MenuButton */
export type MenuButtonCreateInput = Record<string, never>;

/** Input for updating a MenuButton */
export type MenuButtonUpdateInput = Partial<MenuButtonCreateInput>;

/** A menu item belonging to a menu */
export interface MenuItem {
  /** Unique identifier for this menu item */
  id: string;
}

/** Input for creating a MenuItem */
export type MenuItemCreateInput = Record<string, never>;

/** Input for updating a MenuItem */
export type MenuItemUpdateInput = Partial<MenuItemCreateInput>;

/** A outline belonging to a window */
export interface Outline {
  /** Unique identifier for this outline */
  id: string;
}

/** Input for creating a Outline */
export type OutlineCreateInput = Record<string, never>;

/** Input for updating a Outline */
export type OutlineUpdateInput = Partial<OutlineCreateInput>;

/** A pop over belonging to a window */
export interface PopOver {
  /** Unique identifier for this pop over */
  id: string;
}

/** Input for creating a PopOver */
export type PopOverCreateInput = Record<string, never>;

/** Input for updating a PopOver */
export type PopOverUpdateInput = Partial<PopOverCreateInput>;

/** A pop up button belonging to a window */
export interface PopUpButton {
  /** Unique identifier for this pop up button */
  id: string;
}

/** Input for creating a PopUpButton */
export type PopUpButtonCreateInput = Record<string, never>;

/** Input for updating a PopUpButton */
export type PopUpButtonUpdateInput = Partial<PopUpButtonCreateInput>;

/** A process running on this computer */
export interface Process {
  /** Is the process high-level event aware (accepts open application, open document, print document, and quit)? */
  acceptsHighLevelEvents: boolean;
  /** Does the process accept remote events? */
  acceptsRemoteEvents: boolean;
  /** the architecture in which the process is running */
  architecture: string;
  /** Does the process run exclusively in the background? */
  backgroundOnly: boolean;
  /** the bundle identifier of the process' application file */
  bundleIdentifier: string;
  /** Is the process running in the Classic environment? */
  classic: boolean;
  /** the OSType of the creator of the process (the signature) */
  creatorType: string;
  /** the name of the file from which the process was launched, as displayed in the User Interface */
  displayedName: string;
  /** the file from which the process was launched */
  file: string;
  /** the OSType of the file type of the process */
  fileType: string;
  /** Is the process the frontmost process */
  frontmost: boolean;
  /** Does the process have a scripting terminology, i.e., can it be scripted? */
  hasScriptingTerminology: boolean;
  /** The unique identifier of the process */
  id: number;
  /** the name of the process */
  name: string;
  /** the number of bytes currently used in the process' partition */
  partitionSpaceUsed: number;
  /** the short name of the file from which the process was launched */
  shortName: string;
  /** the size of the partition with which the process was launched */
  totalPartitionSize: number;
  /** The Unix process identifier of a process running in the native environment, or -1 for a process running in the Classic environment */
  unixId: number;
  /** Is the process' layer visible? */
  visible: string;
}

/** Input for creating a Process */
export interface ProcessCreateInput {
  /** Is the process the frontmost process */
  frontmost?: boolean;
  /** Is the process' layer visible? */
  visible?: string;
}

/** Input for updating a Process */
export type ProcessUpdateInput = Partial<ProcessCreateInput>;

/** A progress indicator belonging to a window */
export interface ProgressIndicator {
  /** Unique identifier for this progress indicator */
  id: string;
}

/** Input for creating a ProgressIndicator */
export type ProgressIndicatorCreateInput = Record<string, never>;

/** Input for updating a ProgressIndicator */
export type ProgressIndicatorUpdateInput = Partial<ProgressIndicatorCreateInput>;

/** A radio button belonging to a window */
export interface RadioButton {
  /** Unique identifier for this radio button */
  id: string;
}

/** Input for creating a RadioButton */
export type RadioButtonCreateInput = Record<string, never>;

/** Input for updating a RadioButton */
export type RadioButtonUpdateInput = Partial<RadioButtonCreateInput>;

/** A radio button group belonging to a window */
export interface RadioGroup {
  /** Unique identifier for this radio group */
  id: string;
}

/** Input for creating a RadioGroup */
export type RadioGroupCreateInput = Record<string, never>;

/** Input for updating a RadioGroup */
export type RadioGroupUpdateInput = Partial<RadioGroupCreateInput>;

/** A relevance indicator belonging to a window */
export interface RelevanceIndicator {
  /** Unique identifier for this relevance indicator */
  id: string;
}

/** Input for creating a RelevanceIndicator */
export type RelevanceIndicatorCreateInput = Record<string, never>;

/** Input for updating a RelevanceIndicator */
export type RelevanceIndicatorUpdateInput = Partial<RelevanceIndicatorCreateInput>;

/** A row belonging to a table */
export interface Row {
  /** Unique identifier for this row */
  id: string;
}

/** Input for creating a Row */
export type RowCreateInput = Record<string, never>;

/** Input for updating a Row */
export type RowUpdateInput = Partial<RowCreateInput>;

/** A scroll area belonging to a window */
export interface ScrollArea {
  /** Unique identifier for this scroll area */
  id: string;
}

/** Input for creating a ScrollArea */
export type ScrollAreaCreateInput = Record<string, never>;

/** Input for updating a ScrollArea */
export type ScrollAreaUpdateInput = Partial<ScrollAreaCreateInput>;

/** A scroll bar belonging to a window */
export interface ScrollBar {
  /** Unique identifier for this scroll bar */
  id: string;
}

/** Input for creating a ScrollBar */
export type ScrollBarCreateInput = Record<string, never>;

/** Input for updating a ScrollBar */
export type ScrollBarUpdateInput = Partial<ScrollBarCreateInput>;

/** A sheet displayed over a window */
export interface Sheet {
  /** Unique identifier for this sheet */
  id: string;
}

/** Input for creating a Sheet */
export type SheetCreateInput = Record<string, never>;

/** Input for updating a Sheet */
export type SheetUpdateInput = Partial<SheetCreateInput>;

/** A slider belonging to a window */
export interface Slider {
  /** Unique identifier for this slider */
  id: string;
}

/** Input for creating a Slider */
export type SliderCreateInput = Record<string, never>;

/** Input for updating a Slider */
export type SliderUpdateInput = Partial<SliderCreateInput>;

/** A splitter belonging to a window */
export interface Splitter {
  /** Unique identifier for this splitter */
  id: string;
}

/** Input for creating a Splitter */
export type SplitterCreateInput = Record<string, never>;

/** Input for updating a Splitter */
export type SplitterUpdateInput = Partial<SplitterCreateInput>;

/** A splitter group belonging to a window */
export interface SplitterGroup {
  /** Unique identifier for this splitter group */
  id: string;
}

/** Input for creating a SplitterGroup */
export type SplitterGroupCreateInput = Record<string, never>;

/** Input for updating a SplitterGroup */
export type SplitterGroupUpdateInput = Partial<SplitterGroupCreateInput>;

/** A static text field belonging to a window */
export interface StaticText {
  /** Unique identifier for this static text */
  id: string;
}

/** Input for creating a StaticText */
export type StaticTextCreateInput = Record<string, never>;

/** Input for updating a StaticText */
export type StaticTextUpdateInput = Partial<StaticTextCreateInput>;

/** A tab group belonging to a window */
export interface TabGroup {
  /** Unique identifier for this tab group */
  id: string;
}

/** Input for creating a TabGroup */
export type TabGroupCreateInput = Record<string, never>;

/** Input for updating a TabGroup */
export type TabGroupUpdateInput = Partial<TabGroupCreateInput>;

/** A table belonging to a window */
export interface Table {
  /** Unique identifier for this table */
  id: string;
}

/** Input for creating a Table */
export type TableCreateInput = Record<string, never>;

/** Input for updating a Table */
export type TableUpdateInput = Partial<TableCreateInput>;

/** A text area belonging to a window */
export interface TextArea {
  /** Unique identifier for this text area */
  id: string;
}

/** Input for creating a TextArea */
export type TextAreaCreateInput = Record<string, never>;

/** Input for updating a TextArea */
export type TextAreaUpdateInput = Partial<TextAreaCreateInput>;

/** A text field belonging to a window */
export interface TextField {
  /** Unique identifier for this text field */
  id: string;
}

/** Input for creating a TextField */
export type TextFieldCreateInput = Record<string, never>;

/** Input for updating a TextField */
export type TextFieldUpdateInput = Partial<TextFieldCreateInput>;

/** A toolbar belonging to a window */
export interface Toolbar {
  /** Unique identifier for this toolbar */
  id: string;
}

/** Input for creating a Toolbar */
export type ToolbarCreateInput = Record<string, never>;

/** Input for updating a Toolbar */
export type ToolbarUpdateInput = Partial<ToolbarCreateInput>;

/** A piece of the user interface of a process */
export interface UIElement {
  /** a more complete description of the UI element and its capabilities */
  accessibilityDescription: string;
  /** the class of the UI Element, which identifies it function */
  class: string;
  /** the accessibility description, if available; otherwise, the role description */
  description: string;
  /** Is the UI element enabled? ( Does it accept clicks? ) */
  enabled: string;
  /** a list of every UI element contained in this UI element and its child UI elements, to the limits of the tree */
  entireContents: string;
  /** Is the focus on this UI element? */
  focused: string;
  /** an elaborate description of the UI element and its capabilities */
  help: string;
  /** the maximum value that the UI element can take on */
  maximumValue: string;
  /** the minimum value that the UI element can take on */
  minimumValue: string;
  /** the name of the UI Element, which identifies it within its container */
  name: string;
  /** the orientation of the UI element */
  orientation: string;
  /** the position of the UI element */
  position: string;
  /** an encoded description of the UI element and its capabilities */
  role: string;
  /** a more complete description of the UI element's role */
  roleDescription: string;
  /** Is the UI element selected? */
  selected: string;
  /** the size of the UI element */
  size: string;
  /** an encoded description of the UI element and its capabilities */
  subrole: string;
  /** the title of the UI element as it appears on the screen */
  title: string;
  /** the current value of the UI element */
  value: string;
}

/** Input for creating a UIElement */
export interface UIElementCreateInput {
  /** Is the focus on this UI element? */
  focused?: string;
  /** the position of the UI element */
  position?: string;
  /** Is the UI element selected? */
  selected?: string;
  /** the size of the UI element */
  size?: string;
  /** the current value of the UI element */
  value?: string;
}

/** Input for updating a UIElement */
export type UIElementUpdateInput = Partial<UIElementCreateInput>;

/** A value indicator ( thumb or slider ) belonging to a scroll bar */
export interface ValueIndicator {
  /** Unique identifier for this value indicator */
  id: string;
}

/** Input for creating a ValueIndicator */
export type ValueIndicatorCreateInput = Record<string, never>;

/** Input for updating a ValueIndicator */
export type ValueIndicatorUpdateInput = Partial<ValueIndicatorCreateInput>;

/** A unit of data in Property List format */
export interface PropertyListItem {
  /** the kind of data stored in the property list item: boolean/data/date/list/number/record/string */
  kind: string;
  /** the name of the property list item ( if any ) */
  name: string;
  /** the text representation of the property list data */
  text: string;
  /** the value of the property list item */
  value: string;
}

/** Input for creating a PropertyListItem */
export interface PropertyListItemCreateInput {
  /** the text representation of the property list data */
  text?: string;
  /** the value of the property list item */
  value?: string;
}

/** Input for updating a PropertyListItem */
export type PropertyListItemUpdateInput = Partial<PropertyListItemCreateInput>;

/** A named value associated with a unit of data in XML format */
export interface XMLAttribute {
  /** the name of the XML attribute */
  name: string;
  /** the value of the XML attribute */
  value: string;
}

/** Input for creating a XMLAttribute */
export interface XMLAttributeCreateInput {
  /** the value of the XML attribute */
  value?: string;
}

/** Input for updating a XMLAttribute */
export type XMLAttributeUpdateInput = Partial<XMLAttributeCreateInput>;

/** Data in XML format */
export interface XMLData {
  /** the unique identifier of the XML data */
  id: string;
  /** the name of the XML data */
  name: string;
  /** the text representation of the XML data */
  text: string;
}

/** Input for creating a XMLData */
export interface XMLDataCreateInput {
  /** the name of the XML data */
  name?: string;
  /** the text representation of the XML data */
  text?: string;
}

/** Input for updating a XMLData */
export type XMLDataUpdateInput = Partial<XMLDataCreateInput>;

/** A unit of data in XML format */
export interface XMLElement {
  /** the unique identifier of the XML element */
  id: string;
  /** the name of the XML element */
  name: string;
  /** the value of the XML element */
  value: string;
}

/** Input for creating a XMLElement */
export interface XMLElementCreateInput {
  /** the value of the XML element */
  value?: string;
}

/** Input for updating a XMLElement */
export type XMLElementUpdateInput = Partial<XMLElementCreateInput>;

/** A class within a suite within a scripting definition */
export interface ScriptingClass {
  /** The name of the class */
  name: string;
  /** The unique identifier of the class */
  id: string;
  /** The description of the class */
  description: string;
  /** Is the class hidden? */
  hidden: boolean;
  /** The plural name of the class */
  pluralName: string;
  /** The name of the suite to which this class belongs */
  suiteName: string;
  /** The class from which this class inherits */
  superclass: unknown;
}

/** Input for creating a ScriptingClass */
export type ScriptingClassCreateInput = Record<string, never>;

/** Input for updating a ScriptingClass */
export type ScriptingClassUpdateInput = Partial<ScriptingClassCreateInput>;

/** A command within a suite within a scripting definition */
export interface ScriptingCommand {
  /** The name of the command */
  name: string;
  /** The unique identifier of the command */
  id: string;
  /** The description of the command */
  description: string;
  /** The direct parameter of the command */
  directParameter: unknown;
  /** Is the command hidden? */
  hidden: boolean;
  /** The object or data returned by this command */
  scriptingResult: unknown;
  /** The name of the suite to which this command belongs */
  suiteName: string;
}

/** Input for creating a ScriptingCommand */
export type ScriptingCommandCreateInput = Record<string, never>;

/** Input for updating a ScriptingCommand */
export type ScriptingCommandUpdateInput = Partial<ScriptingCommandCreateInput>;

/** The scripting definition of the System Events applicaation */
export interface ScriptingDefinitionObject {
  /** Unique identifier for this scripting definition object */
  id: string;
}

/** Input for creating a ScriptingDefinitionObject */
export type ScriptingDefinitionObjectCreateInput = Record<string, never>;

/** Input for updating a ScriptingDefinitionObject */
export type ScriptingDefinitionObjectUpdateInput = Partial<ScriptingDefinitionObjectCreateInput>;

/** An element within a class within a suite within a scripting definition */
export interface ScriptingElement {
  /** Unique identifier for this scripting element */
  id: string;
}

/** Input for creating a ScriptingElement */
export type ScriptingElementCreateInput = Record<string, never>;

/** Input for updating a ScriptingElement */
export type ScriptingElementUpdateInput = Partial<ScriptingElementCreateInput>;

/** An enumeration within a suite within a scripting definition */
export interface ScriptingEnumeration {
  /** The name of the enumeration */
  name: string;
  /** The unique identifier of the enumeration */
  id: string;
  /** Is the enumeration hidden? */
  hidden: boolean;
}

/** Input for creating a ScriptingEnumeration */
export type ScriptingEnumerationCreateInput = Record<string, never>;

/** Input for updating a ScriptingEnumeration */
export type ScriptingEnumerationUpdateInput = Partial<ScriptingEnumerationCreateInput>;

/** An enumerator within an enumeration within a suite within a scripting definition */
export interface ScriptingEnumerator {
  /** The name of the enumerator */
  name: string;
  /** The unique identifier of the enumerator */
  id: string;
  /** The description of the enumerator */
  description: string;
  /** Is the enumerator hidden? */
  hidden: boolean;
}

/** Input for creating a ScriptingEnumerator */
export type ScriptingEnumeratorCreateInput = Record<string, never>;

/** Input for updating a ScriptingEnumerator */
export type ScriptingEnumeratorUpdateInput = Partial<ScriptingEnumeratorCreateInput>;

/** A parameter within a command within a suite within a scripting definition */
export interface ScriptingParameter {
  /** The name of the parameter */
  name: string;
  /** The unique identifier of the parameter */
  id: string;
  /** The description of the parameter */
  description: string;
  /** Is the parameter hidden? */
  hidden: boolean;
  /** The kind of object or data specified by this parameter */
  kind: string;
  /** Is the parameter optional? */
  optional: boolean;
}

/** Input for creating a ScriptingParameter */
export type ScriptingParameterCreateInput = Record<string, never>;

/** Input for updating a ScriptingParameter */
export type ScriptingParameterUpdateInput = Partial<ScriptingParameterCreateInput>;

/** A property within a class within a suite within a scripting definition */
export interface ScriptingProperty {
  /** The name of the property */
  name: string;
  /** The unique identifier of the property */
  id: string;
  /** The type of access to this property */
  access: string;
  /** The description of the property */
  description: string;
  /** Is the property's value an enumerator? */
  enumerated: boolean;
  /** Is the property hidden? */
  hidden: boolean;
  /** The kind of object or data returned by this property */
  kind: string;
  /** Is the property's value a list? */
  listed: boolean;
}

/** Input for creating a ScriptingProperty */
export type ScriptingPropertyCreateInput = Record<string, never>;

/** Input for updating a ScriptingProperty */
export type ScriptingPropertyUpdateInput = Partial<ScriptingPropertyCreateInput>;

/** A suite within a scripting definition */
export interface ScriptingSuite {
  /** The name of the suite */
  name: string;
  /** The unique identifier of the suite */
  id: string;
  /** The description of the suite */
  description: string;
  /** Is the suite hidden? */
  hidden: boolean;
}

/** Input for creating a ScriptingSuite */
export type ScriptingSuiteCreateInput = Record<string, never>;

/** Input for updating a ScriptingSuite */
export type ScriptingSuiteUpdateInput = Partial<ScriptingSuiteCreateInput>;

// Zod schemas for runtime validation

export const ConfigurationSchema = z.object({
  accountName: z.string(),
  connected: z.boolean(),
  id: z.string(),
  name: z.string(),
});

export const InterfaceSchema = z.object({
  automatic: z.boolean(),
  duplex: z.string(),
  id: z.string(),
  kind: z.string(),
  mACAddress: z.string(),
  mtu: z.number(),
  name: z.string(),
  speed: z.number(),
});

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const NetworkPreferencesObjectSchema = z.object({
  currentLocation: z.string(),
});

export const ServiceSchema = z.object({
  active: z.boolean(),
  currentConfiguration: z.string(),
  id: z.string(),
  interface: z.string(),
  kind: z.number(),
  name: z.string(),
});

export const AliasSchema = z.object({
  creatorType: z.string(),
  defaultApplication: z.string(),
  fileType: z.string(),
  kind: z.string(),
  productVersion: z.string(),
  shortVersion: z.string(),
  stationery: z.boolean(),
  typeIdentifier: z.string(),
  version: z.string(),
});

export const ClassicDomainObjectSchema = z.object({
  appleMenuFolder: z.string(),
  controlPanelsFolder: z.string(),
  controlStripModulesFolder: z.string(),
  desktopFolder: z.string(),
  extensionsFolder: z.string(),
  fontsFolder: z.string(),
  launcherItemsFolder: z.string(),
  preferencesFolder: z.string(),
  shutdownFolder: z.string(),
  startupItemsFolder: z.string(),
  systemFolder: z.string(),
});

export const DiskSchema = z.object({
  capacity: z.number(),
  ejectable: z.boolean(),
  format: z.string(),
  freeSpace: z.number(),
  ignorePrivileges: z.boolean(),
  localVolume: z.boolean(),
  server: z.string(),
  startup: z.boolean(),
  zone: z.string(),
});

export const DiskItemSchema = z.object({
  busyStatus: z.boolean(),
  container: z.string(),
  creationDate: z.string(),
  displayedName: z.string(),
  id: z.string(),
  modificationDate: z.string(),
  name: z.string(),
  nameExtension: z.string(),
  packageFolder: z.boolean(),
  path: z.string(),
  physicalSize: z.number(),
  pOSIXPath: z.string(),
  size: z.number(),
  uRL: z.string(),
  visible: z.boolean(),
  volume: z.string(),
});

export const DomainSchema = z.object({
  applicationSupportFolder: z.string(),
  applicationsFolder: z.string(),
  desktopPicturesFolder: z.string(),
  folderActionScriptsFolder: z.string(),
  fontsFolder: z.string(),
  id: z.string(),
  libraryFolder: z.string(),
  name: z.string(),
  preferencesFolder: z.string(),
  scriptingAdditionsFolder: z.string(),
  scriptsFolder: z.string(),
  sharedDocumentsFolder: z.string(),
  speakableItemsFolder: z.string(),
  utilitiesFolder: z.string(),
  workflowsFolder: z.string(),
});

export const FileSchema = z.object({
  creatorType: z.string(),
  defaultApplication: z.string(),
  fileType: z.string(),
  kind: z.string(),
  productVersion: z.string(),
  shortVersion: z.string(),
  stationery: z.boolean(),
  typeIdentifier: z.string(),
  version: z.string(),
});

export const FilePackageSchema = z.object({
  id: z.string(),
});

export const FolderSchema = z.object({
  id: z.string(),
});

export const LocalDomainObjectSchema = z.object({
  id: z.string(),
});

export const NetworkDomainObjectSchema = z.object({
  id: z.string(),
});

export const SystemDomainObjectSchema = z.object({
  id: z.string(),
});

export const UserDomainObjectSchema = z.object({
  desktopFolder: z.string(),
  documentsFolder: z.string(),
  downloadsFolder: z.string(),
  favoritesFolder: z.string(),
  homeFolder: z.string(),
  moviesFolder: z.string(),
  musicFolder: z.string(),
  picturesFolder: z.string(),
  publicFolder: z.string(),
  sitesFolder: z.string(),
  temporaryItemsFolder: z.string(),
});

export const ActionSchema = z.object({
  description: z.string(),
  name: z.string(),
});

export const AttributeSchema = z.object({
  name: z.string(),
  settable: z.boolean(),
  value: z.string(),
});

export const BrowserSchema = z.object({
  id: z.string(),
});

export const BusyIndicatorSchema = z.object({
  id: z.string(),
});

export const ButtonSchema = z.object({
  id: z.string(),
});

export const CheckboxSchema = z.object({
  id: z.string(),
});

export const ColorWellSchema = z.object({
  id: z.string(),
});

export const ColumnSchema = z.object({
  id: z.string(),
});

export const ComboBoxSchema = z.object({
  id: z.string(),
});

export const DrawerSchema = z.object({
  id: z.string(),
});

export const GroupSchema = z.object({
  id: z.string(),
});

export const GrowAreaSchema = z.object({
  id: z.string(),
});

export const ImageSchema = z.object({
  id: z.string(),
});

export const IncrementorSchema = z.object({
  id: z.string(),
});

export const ListSchema = z.object({
  id: z.string(),
});

export const MenuSchema = z.object({
  id: z.string(),
});

export const MenuBarSchema = z.object({
  id: z.string(),
});

export const MenuBarItemSchema = z.object({
  id: z.string(),
});

export const MenuButtonSchema = z.object({
  id: z.string(),
});

export const MenuItemSchema = z.object({
  id: z.string(),
});

export const OutlineSchema = z.object({
  id: z.string(),
});

export const PopOverSchema = z.object({
  id: z.string(),
});

export const PopUpButtonSchema = z.object({
  id: z.string(),
});

export const ProcessSchema = z.object({
  acceptsHighLevelEvents: z.boolean(),
  acceptsRemoteEvents: z.boolean(),
  architecture: z.string(),
  backgroundOnly: z.boolean(),
  bundleIdentifier: z.string(),
  classic: z.boolean(),
  creatorType: z.string(),
  displayedName: z.string(),
  file: z.string(),
  fileType: z.string(),
  frontmost: z.boolean(),
  hasScriptingTerminology: z.boolean(),
  id: z.number(),
  name: z.string(),
  partitionSpaceUsed: z.number(),
  shortName: z.string(),
  totalPartitionSize: z.number(),
  unixId: z.number(),
  visible: z.string(),
});

export const ProgressIndicatorSchema = z.object({
  id: z.string(),
});

export const RadioButtonSchema = z.object({
  id: z.string(),
});

export const RadioGroupSchema = z.object({
  id: z.string(),
});

export const RelevanceIndicatorSchema = z.object({
  id: z.string(),
});

export const RowSchema = z.object({
  id: z.string(),
});

export const ScrollAreaSchema = z.object({
  id: z.string(),
});

export const ScrollBarSchema = z.object({
  id: z.string(),
});

export const SheetSchema = z.object({
  id: z.string(),
});

export const SliderSchema = z.object({
  id: z.string(),
});

export const SplitterSchema = z.object({
  id: z.string(),
});

export const SplitterGroupSchema = z.object({
  id: z.string(),
});

export const StaticTextSchema = z.object({
  id: z.string(),
});

export const TabGroupSchema = z.object({
  id: z.string(),
});

export const TableSchema = z.object({
  id: z.string(),
});

export const TextAreaSchema = z.object({
  id: z.string(),
});

export const TextFieldSchema = z.object({
  id: z.string(),
});

export const ToolbarSchema = z.object({
  id: z.string(),
});

export const UIElementSchema = z.object({
  accessibilityDescription: z.string(),
  class: z.string(),
  description: z.string(),
  enabled: z.string(),
  entireContents: z.string(),
  focused: z.string(),
  help: z.string(),
  maximumValue: z.string(),
  minimumValue: z.string(),
  name: z.string(),
  orientation: z.string(),
  position: z.string(),
  role: z.string(),
  roleDescription: z.string(),
  selected: z.string(),
  size: z.string(),
  subrole: z.string(),
  title: z.string(),
  value: z.string(),
});

export const ValueIndicatorSchema = z.object({
  id: z.string(),
});

export const PropertyListItemSchema = z.object({
  kind: z.string(),
  name: z.string(),
  text: z.string(),
  value: z.string(),
});

export const XMLAttributeSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const XMLDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  text: z.string(),
});

export const XMLElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
});

export const ScriptingClassSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
  pluralName: z.string(),
  suiteName: z.string(),
  superclass: z.string(),
});

export const ScriptingCommandSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  directParameter: z.string(),
  hidden: z.boolean(),
  scriptingResult: z.string(),
  suiteName: z.string(),
});

export const ScriptingDefinitionObjectSchema = z.object({
  id: z.string(),
});

export const ScriptingElementSchema = z.object({
  id: z.string(),
});

export const ScriptingEnumerationSchema = z.object({
  name: z.string(),
  id: z.string(),
  hidden: z.boolean(),
});

export const ScriptingEnumeratorSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
});

export const ScriptingParameterSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
  kind: z.string(),
  optional: z.boolean(),
});

export const ScriptingPropertySchema = z.object({
  name: z.string(),
  id: z.string(),
  access: z.string(),
  description: z.string(),
  enumerated: z.boolean(),
  hidden: z.boolean(),
  kind: z.string(),
  listed: z.boolean(),
});

export const ScriptingSuiteSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
});
