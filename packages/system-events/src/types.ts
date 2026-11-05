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

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Configuration } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ConfigurationCreateInput = import('./contract/index.js').ConfigurationCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ConfigurationUpdateInput = import('./contract/index.js').ConfigurationUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Interface } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type InterfaceCreateInput = Omit<
  import('./contract/index.js').InterfaceCreateInput,
  'mtu' | 'speed'
> & {
  /** the packet size Numeric values are validated by the contract before dispatch. */
  mtu?: number | Extract<import('./contract/index.js').InterfaceCreateInput['mtu'], null>
  /** ethernet speed 10 | 100 | 1000 Numeric values are validated by the contract before dispatch. */
  speed?: number | Extract<import('./contract/index.js').InterfaceCreateInput['speed'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type InterfaceUpdateInput = Omit<
  import('./contract/index.js').InterfaceUpdateInput,
  'mtu' | 'speed'
> & {
  /** the packet size Numeric values are validated by the contract before dispatch. */
  mtu?: number | Extract<import('./contract/index.js').InterfaceUpdateInput['mtu'], null>
  /** ethernet speed 10 | 100 | 1000 Numeric values are validated by the contract before dispatch. */
  speed?: number | Extract<import('./contract/index.js').InterfaceUpdateInput['speed'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Location } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type LocationCreateInput = import('./contract/index.js').LocationCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type LocationUpdateInput = import('./contract/index.js').LocationUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { NetworkPreferencesObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type NetworkPreferencesObjectCreateInput =
  import('./contract/index.js').NetworkPreferencesObjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type NetworkPreferencesObjectUpdateInput =
  import('./contract/index.js').NetworkPreferencesObjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Service } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ServiceCreateInput = import('./contract/index.js').ServiceCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ServiceUpdateInput = import('./contract/index.js').ServiceUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Alias } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AliasCreateInput = import('./contract/index.js').AliasCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AliasUpdateInput = import('./contract/index.js').AliasUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ClassicDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ClassicDomainObjectCreateInput =
  import('./contract/index.js').ClassicDomainObjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ClassicDomainObjectUpdateInput =
  import('./contract/index.js').ClassicDomainObjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Disk } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DiskCreateInput = import('./contract/index.js').DiskCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DiskUpdateInput = import('./contract/index.js').DiskUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { DiskItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DiskItemCreateInput = import('./contract/index.js').DiskItemCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DiskItemUpdateInput = import('./contract/index.js').DiskItemUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Domain } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DomainCreateInput = import('./contract/index.js').DomainCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DomainUpdateInput = import('./contract/index.js').DomainUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { File } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FileCreateInput = import('./contract/index.js').FileCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FileUpdateInput = import('./contract/index.js').FileUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { FilePackage } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FilePackageCreateInput = import('./contract/index.js').FilePackageCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FilePackageUpdateInput = import('./contract/index.js').FilePackageUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FolderCreateInput = import('./contract/index.js').FolderCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FolderUpdateInput = import('./contract/index.js').FolderUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { LocalDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type LocalDomainObjectCreateInput =
  import('./contract/index.js').LocalDomainObjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type LocalDomainObjectUpdateInput =
  import('./contract/index.js').LocalDomainObjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { NetworkDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type NetworkDomainObjectCreateInput =
  import('./contract/index.js').NetworkDomainObjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type NetworkDomainObjectUpdateInput =
  import('./contract/index.js').NetworkDomainObjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SystemDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SystemDomainObjectCreateInput =
  import('./contract/index.js').SystemDomainObjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SystemDomainObjectUpdateInput =
  import('./contract/index.js').SystemDomainObjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { UserDomainObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type UserDomainObjectCreateInput = import('./contract/index.js').UserDomainObjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type UserDomainObjectUpdateInput = import('./contract/index.js').UserDomainObjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Action } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ActionCreateInput = import('./contract/index.js').ActionCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ActionUpdateInput = import('./contract/index.js').ActionUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Attribute } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AttributeCreateInput = import('./contract/index.js').AttributeCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AttributeUpdateInput = import('./contract/index.js').AttributeUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Browser } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BrowserCreateInput = import('./contract/index.js').BrowserCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type BrowserUpdateInput = import('./contract/index.js').BrowserUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BusyIndicator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BusyIndicatorCreateInput = import('./contract/index.js').BusyIndicatorCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type BusyIndicatorUpdateInput = import('./contract/index.js').BusyIndicatorUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Button } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ButtonCreateInput = import('./contract/index.js').ButtonCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ButtonUpdateInput = import('./contract/index.js').ButtonUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Checkbox } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type CheckboxCreateInput = import('./contract/index.js').CheckboxCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type CheckboxUpdateInput = import('./contract/index.js').CheckboxUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ColorWell } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ColorWellCreateInput = import('./contract/index.js').ColorWellCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ColorWellUpdateInput = import('./contract/index.js').ColorWellUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Column } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ColumnCreateInput = import('./contract/index.js').ColumnCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ColumnUpdateInput = import('./contract/index.js').ColumnUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ComboBox } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ComboBoxCreateInput = import('./contract/index.js').ComboBoxCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ComboBoxUpdateInput = import('./contract/index.js').ComboBoxUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Drawer } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DrawerCreateInput = import('./contract/index.js').DrawerCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DrawerUpdateInput = import('./contract/index.js').DrawerUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Group } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type GroupCreateInput = import('./contract/index.js').GroupCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type GroupUpdateInput = import('./contract/index.js').GroupUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { GrowArea } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type GrowAreaCreateInput = import('./contract/index.js').GrowAreaCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type GrowAreaUpdateInput = import('./contract/index.js').GrowAreaUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Image } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ImageCreateInput = import('./contract/index.js').ImageCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ImageUpdateInput = import('./contract/index.js').ImageUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Incrementor } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type IncrementorCreateInput = import('./contract/index.js').IncrementorCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type IncrementorUpdateInput = import('./contract/index.js').IncrementorUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { List } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ListCreateInput = import('./contract/index.js').ListCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ListUpdateInput = import('./contract/index.js').ListUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Menu } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MenuCreateInput = import('./contract/index.js').MenuCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type MenuUpdateInput = import('./contract/index.js').MenuUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MenuBar } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MenuBarCreateInput = import('./contract/index.js').MenuBarCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type MenuBarUpdateInput = import('./contract/index.js').MenuBarUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MenuBarItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MenuBarItemCreateInput = import('./contract/index.js').MenuBarItemCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type MenuBarItemUpdateInput = import('./contract/index.js').MenuBarItemUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MenuButton } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MenuButtonCreateInput = import('./contract/index.js').MenuButtonCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type MenuButtonUpdateInput = import('./contract/index.js').MenuButtonUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MenuItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MenuItemCreateInput = import('./contract/index.js').MenuItemCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type MenuItemUpdateInput = import('./contract/index.js').MenuItemUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Outline } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type OutlineCreateInput = import('./contract/index.js').OutlineCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type OutlineUpdateInput = import('./contract/index.js').OutlineUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PopOver } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type PopOverCreateInput = import('./contract/index.js').PopOverCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type PopOverUpdateInput = import('./contract/index.js').PopOverUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PopUpButton } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type PopUpButtonCreateInput = import('./contract/index.js').PopUpButtonCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type PopUpButtonUpdateInput = import('./contract/index.js').PopUpButtonUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Process } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ProcessCreateInput = import('./contract/index.js').ProcessCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ProcessUpdateInput = import('./contract/index.js').ProcessUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ProgressIndicator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ProgressIndicatorCreateInput =
  import('./contract/index.js').ProgressIndicatorCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ProgressIndicatorUpdateInput =
  import('./contract/index.js').ProgressIndicatorUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RadioButton } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type RadioButtonCreateInput = import('./contract/index.js').RadioButtonCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type RadioButtonUpdateInput = import('./contract/index.js').RadioButtonUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RadioGroup } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type RadioGroupCreateInput = import('./contract/index.js').RadioGroupCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type RadioGroupUpdateInput = import('./contract/index.js').RadioGroupUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RelevanceIndicator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type RelevanceIndicatorCreateInput =
  import('./contract/index.js').RelevanceIndicatorCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type RelevanceIndicatorUpdateInput =
  import('./contract/index.js').RelevanceIndicatorUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Row } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type RowCreateInput = import('./contract/index.js').RowCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type RowUpdateInput = import('./contract/index.js').RowUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScrollArea } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScrollAreaCreateInput = import('./contract/index.js').ScrollAreaCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScrollAreaUpdateInput = import('./contract/index.js').ScrollAreaUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScrollBar } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScrollBarCreateInput = import('./contract/index.js').ScrollBarCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScrollBarUpdateInput = import('./contract/index.js').ScrollBarUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Sheet } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SheetCreateInput = import('./contract/index.js').SheetCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SheetUpdateInput = import('./contract/index.js').SheetUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Slider } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SliderCreateInput = import('./contract/index.js').SliderCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SliderUpdateInput = import('./contract/index.js').SliderUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Splitter } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SplitterCreateInput = import('./contract/index.js').SplitterCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SplitterUpdateInput = import('./contract/index.js').SplitterUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SplitterGroup } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SplitterGroupCreateInput = import('./contract/index.js').SplitterGroupCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SplitterGroupUpdateInput = import('./contract/index.js').SplitterGroupUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { StaticText } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type StaticTextCreateInput = import('./contract/index.js').StaticTextCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type StaticTextUpdateInput = import('./contract/index.js').StaticTextUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TabGroup } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TabGroupCreateInput = import('./contract/index.js').TabGroupCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TabGroupUpdateInput = import('./contract/index.js').TabGroupUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Table } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TableCreateInput = import('./contract/index.js').TableCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TableUpdateInput = import('./contract/index.js').TableUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TextArea } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TextAreaCreateInput = import('./contract/index.js').TextAreaCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TextAreaUpdateInput = import('./contract/index.js').TextAreaUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TextField } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TextFieldCreateInput = import('./contract/index.js').TextFieldCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TextFieldUpdateInput = import('./contract/index.js').TextFieldUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Toolbar } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ToolbarCreateInput = import('./contract/index.js').ToolbarCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ToolbarUpdateInput = import('./contract/index.js').ToolbarUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { UIElement } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type UIElementCreateInput = import('./contract/index.js').UIElementCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type UIElementUpdateInput = import('./contract/index.js').UIElementUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ValueIndicator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ValueIndicatorCreateInput = import('./contract/index.js').ValueIndicatorCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ValueIndicatorUpdateInput = import('./contract/index.js').ValueIndicatorUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PropertyListItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type PropertyListItemCreateInput = import('./contract/index.js').PropertyListItemCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type PropertyListItemUpdateInput = import('./contract/index.js').PropertyListItemUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { XMLAttribute } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type XMLAttributeCreateInput = import('./contract/index.js').XMLAttributeCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type XMLAttributeUpdateInput = import('./contract/index.js').XMLAttributeUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { XMLData } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type XMLDataCreateInput = import('./contract/index.js').XMLDataCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type XMLDataUpdateInput = import('./contract/index.js').XMLDataUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { XMLElement } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type XMLElementCreateInput = import('./contract/index.js').XMLElementCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type XMLElementUpdateInput = import('./contract/index.js').XMLElementUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingClass } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingClassCreateInput = import('./contract/index.js').ScriptingClassCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingClassUpdateInput = import('./contract/index.js').ScriptingClassUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingCommand } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingCommandCreateInput = import('./contract/index.js').ScriptingCommandCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingCommandUpdateInput = import('./contract/index.js').ScriptingCommandUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingDefinitionObject } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingDefinitionObjectCreateInput =
  import('./contract/index.js').ScriptingDefinitionObjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingDefinitionObjectUpdateInput =
  import('./contract/index.js').ScriptingDefinitionObjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingElement } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingElementCreateInput = import('./contract/index.js').ScriptingElementCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingElementUpdateInput = import('./contract/index.js').ScriptingElementUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingEnumeration } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingEnumerationCreateInput =
  import('./contract/index.js').ScriptingEnumerationCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingEnumerationUpdateInput =
  import('./contract/index.js').ScriptingEnumerationUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingEnumerator } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingEnumeratorCreateInput =
  import('./contract/index.js').ScriptingEnumeratorCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingEnumeratorUpdateInput =
  import('./contract/index.js').ScriptingEnumeratorUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingParameter } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingParameterCreateInput =
  import('./contract/index.js').ScriptingParameterCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingParameterUpdateInput =
  import('./contract/index.js').ScriptingParameterUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingProperty } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingPropertyCreateInput =
  import('./contract/index.js').ScriptingPropertyCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingPropertyUpdateInput =
  import('./contract/index.js').ScriptingPropertyUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ScriptingSuite } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScriptingSuiteCreateInput = import('./contract/index.js').ScriptingSuiteCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScriptingSuiteUpdateInput = import('./contract/index.js').ScriptingSuiteUpdateInput

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
  id: z.string(),
  name: z.string(),
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DomainSchema = z.object({
  id: z.string(),
  name: z.string(),
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
  id: z.string(),
  name: z.string(),
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
