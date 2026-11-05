/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { SaveableFileFormat } from './contract/index.js'

export type { ScrollPageBehaviors } from './contract/index.js'

export type { FontSmoothingStyles } from './contract/index.js'

export type { Appearances } from './contract/index.js'

export type { HighlightColors } from './contract/index.js'

export type { Dhac } from './contract/index.js'

export type { DynamicStyle } from './contract/index.js'

export type { Dpls } from './contract/index.js'

export type { Dpef } from './contract/index.js'

export type { Dpbh } from './contract/index.js'

export type { Edfm } from './contract/index.js'

export type { EMds } from './contract/index.js'

export type { EMky } from './contract/index.js'

export type { Enum } from './contract/index.js'

export type { Actn } from './contract/index.js'

export type { Accs } from './contract/index.js'

export type { ClassicDomainObjectKind } from './contract/index.js'

export type { UserDomainObjectKind } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Configuration } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ConfigurationCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ConfigurationUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Interface } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type InterfaceCreateInput = Omit<
  import('./contract/index.js').InterfaceCreateInput,
  'mtu' | 'speed'
> & {
  /** the packet size Numeric values are validated by the contract before dispatch. */
  mtu?: null extends import('./contract/index.js').InterfaceCreateInput['mtu']
    ? number | null
    : number
  /** ethernet speed 10 | 100 | 1000 Numeric values are validated by the contract before dispatch. */
  speed?: null extends import('./contract/index.js').InterfaceCreateInput['speed']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type InterfaceUpdateInput = Omit<
  import('./contract/index.js').InterfaceUpdateInput,
  'mtu' | 'speed'
> & {
  /** the packet size Numeric values are validated by the contract before dispatch. */
  mtu?: null extends import('./contract/index.js').InterfaceUpdateInput['mtu']
    ? number | null
    : number
  /** ethernet speed 10 | 100 | 1000 Numeric values are validated by the contract before dispatch. */
  speed?: null extends import('./contract/index.js').InterfaceUpdateInput['speed']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Location } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { LocationCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { LocationUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { NetworkPreferencesObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { NetworkPreferencesObjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { NetworkPreferencesObjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Service } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ServiceCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ServiceUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Alias } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AliasCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AliasUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ClassicDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ClassicDomainObjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ClassicDomainObjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Disk } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DiskCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DiskUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { DiskItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DiskItemCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DiskItemUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Domain } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DomainCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DomainUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { File } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FileCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FileUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { FilePackage } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FilePackageCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FilePackageUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FolderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FolderUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { LocalDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { LocalDomainObjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { LocalDomainObjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { NetworkDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { NetworkDomainObjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { NetworkDomainObjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SystemDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SystemDomainObjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SystemDomainObjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { UserDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { UserDomainObjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { UserDomainObjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Action } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ActionCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ActionUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Attribute } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AttributeCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AttributeUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Browser } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { BrowserCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { BrowserUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BusyIndicator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { BusyIndicatorCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { BusyIndicatorUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Button } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ButtonCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ButtonUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Checkbox } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { CheckboxCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { CheckboxUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ColorWell } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ColorWellCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ColorWellUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Column } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ColumnCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ColumnUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ComboBox } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ComboBoxCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ComboBoxUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Drawer } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DrawerCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DrawerUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Group } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { GroupCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { GroupUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { GrowArea } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { GrowAreaCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { GrowAreaUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Image } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ImageCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ImageUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Incrementor } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { IncrementorCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { IncrementorUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { List } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ListCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ListUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Menu } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MenuCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MenuUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MenuBar } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MenuBarCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MenuBarUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MenuBarItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MenuBarItemCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MenuBarItemUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MenuButton } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MenuButtonCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MenuButtonUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MenuItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MenuItemCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MenuItemUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Outline } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { OutlineCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { OutlineUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PopOver } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PopOverCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PopOverUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PopUpButton } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PopUpButtonCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PopUpButtonUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Process } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ProcessCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ProcessUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ProgressIndicator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ProgressIndicatorCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ProgressIndicatorUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RadioButton } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RadioButtonCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RadioButtonUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RadioGroup } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RadioGroupCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RadioGroupUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RelevanceIndicator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RelevanceIndicatorCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RelevanceIndicatorUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Row } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RowCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RowUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScrollArea } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScrollAreaCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScrollAreaUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScrollBar } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScrollBarCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScrollBarUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Sheet } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SheetCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SheetUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Slider } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SliderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SliderUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Splitter } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SplitterCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SplitterUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SplitterGroup } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SplitterGroupCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SplitterGroupUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { StaticText } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { StaticTextCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { StaticTextUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TabGroup } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TabGroupCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TabGroupUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Table } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TableCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TableUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TextArea } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TextAreaCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TextAreaUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TextField } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TextFieldCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TextFieldUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Toolbar } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ToolbarCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ToolbarUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { UIElement } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { UIElementCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { UIElementUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ValueIndicator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ValueIndicatorCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ValueIndicatorUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PropertyListItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PropertyListItemCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PropertyListItemUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { XMLAttribute } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { XMLAttributeCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { XMLAttributeUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { XMLData } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { XMLDataCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { XMLDataUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { XMLElement } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { XMLElementCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { XMLElementUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingClass } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingClassCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingClassUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingCommand } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingCommandCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingCommandUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingDefinitionObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingDefinitionObjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingDefinitionObjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingElement } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingElementCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingElementUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingEnumeration } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingEnumerationCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingEnumerationUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingEnumerator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingEnumeratorCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingEnumeratorUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingParameter } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingParameterCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingParameterUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingProperty } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingPropertyCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingPropertyUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingSuite } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScriptingSuiteCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScriptingSuiteUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ConfigurationSchema = z.object({
  accountName: z.string(),
  connected: z.boolean(),
  id: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const InterfaceSchema = z.object({
  automatic: z.boolean(),
  duplex: z.string(),
  id: z.string(),
  kind: z.string(),
  mACAddress: z.string(),
  mtu: z.number(),
  name: z.string(),
  speed: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const NetworkPreferencesObjectSchema = z.object({})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ServiceSchema = z.object({
  active: z.boolean(),
  id: z.string(),
  kind: z.number(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ClassicDomainObjectSchema = z.object({
  preferencesFolder: z.string(),
  kind: z.string(),
  applicationSupportFolder: z.string(),
  applicationsFolder: z.string(),
  id: z.string(),
  libraryFolder: z.string(),
  name: z.string(),
  scriptsFolder: z.string(),
  workflowsFolder: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
  posixPath: z.string(),
  size: z.number(),
  uRL: z.string(),
  visible: z.boolean(),
  volume: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FilePackageSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FolderSchema = z.object({
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
  posixPath: z.string(),
  size: z.number(),
  uRL: z.string(),
  visible: z.boolean(),
  volume: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const LocalDomainObjectSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const NetworkDomainObjectSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SystemDomainObjectSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
  kind: z.string(),
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ActionSchema = z.object({
  description: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AttributeSchema = z.object({
  name: z.string(),
  settable: z.boolean(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BrowserSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BusyIndicatorSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ButtonSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const CheckboxSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ColorWellSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ColumnSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ComboBoxSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DrawerSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const GroupSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const GrowAreaSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ImageSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const IncrementorSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ListSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MenuSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MenuBarSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MenuBarItemSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MenuButtonSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MenuItemSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const OutlineSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PopOverSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PopUpButtonSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ProgressIndicatorSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RadioButtonSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RadioGroupSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RelevanceIndicatorSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RowSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScrollAreaSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScrollBarSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SheetSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SliderSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SplitterSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SplitterGroupSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const StaticTextSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TabGroupSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TableSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TextAreaSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TextFieldSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ToolbarSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ValueIndicatorSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PropertyListItemSchema = z.object({
  kind: z.string(),
  name: z.string(),
  text: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const XMLAttributeSchema = z.object({
  name: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const XMLDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  text: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const XMLElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingClassSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
  pluralName: z.string(),
  suiteName: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingCommandSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
  scriptingResult: z.string(),
  suiteName: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingDefinitionObjectSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingElementSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingEnumerationSchema = z.object({
  name: z.string(),
  id: z.string(),
  hidden: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingEnumeratorSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingParameterSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
  kind: z.string(),
  optional: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingPropertySchema = z.object({
  name: z.string(),
  id: z.string(),
  access: z.string(),
  description: z.string(),
  enumerated: z.boolean(),
  hidden: z.boolean(),
  kind: z.string(),
  listed: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScriptingSuiteSchema = z.object({
  name: z.string(),
  id: z.string(),
  description: z.string(),
  hidden: z.boolean(),
})
