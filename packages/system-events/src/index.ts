/**
 * System Events HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { SystemEventsClient } from '@macts/sdk-system events';
 *
 * const client = new SystemEventsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { SystemEventsClient, SystemEventsError, HttpClient } from './client.js';
export type { SystemEventsClientOptions } from './client.js';
export * from './types.js';
export { ConfigurationResourceClient } from './resources/configuration.js';
export { InterfaceResourceClient } from './resources/interface.js';
export { LocationResourceClient } from './resources/location.js';
export { NetworkPreferencesObjectResourceClient } from './resources/networkpreferencesobject.js';
export { ServiceResourceClient } from './resources/service.js';
export { AliasResourceClient } from './resources/alias.js';
export { ClassicDomainObjectResourceClient } from './resources/classicdomainobject.js';
export { DiskResourceClient } from './resources/disk.js';
export { DiskItemResourceClient } from './resources/diskitem.js';
export { DomainResourceClient } from './resources/domain.js';
export { FileResourceClient } from './resources/file.js';
export { FilePackageResourceClient } from './resources/filepackage.js';
export { FolderResourceClient } from './resources/folder.js';
export { LocalDomainObjectResourceClient } from './resources/localdomainobject.js';
export { NetworkDomainObjectResourceClient } from './resources/networkdomainobject.js';
export { SystemDomainObjectResourceClient } from './resources/systemdomainobject.js';
export { UserDomainObjectResourceClient } from './resources/userdomainobject.js';
export { ActionResourceClient } from './resources/action.js';
export { AttributeResourceClient } from './resources/attribute.js';
export { BrowserResourceClient } from './resources/browser.js';
export { BusyIndicatorResourceClient } from './resources/busyindicator.js';
export { ButtonResourceClient } from './resources/button.js';
export { CheckboxResourceClient } from './resources/checkbox.js';
export { ColorWellResourceClient } from './resources/colorwell.js';
export { ColumnResourceClient } from './resources/column.js';
export { ComboBoxResourceClient } from './resources/combobox.js';
export { DrawerResourceClient } from './resources/drawer.js';
export { GroupResourceClient } from './resources/group.js';
export { GrowAreaResourceClient } from './resources/growarea.js';
export { ImageResourceClient } from './resources/image.js';
export { IncrementorResourceClient } from './resources/incrementor.js';
export { ListResourceClient } from './resources/list.js';
export { MenuResourceClient } from './resources/menu.js';
export { MenuBarResourceClient } from './resources/menubar.js';
export { MenuBarItemResourceClient } from './resources/menubaritem.js';
export { MenuButtonResourceClient } from './resources/menubutton.js';
export { MenuItemResourceClient } from './resources/menuitem.js';
export { OutlineResourceClient } from './resources/outline.js';
export { PopOverResourceClient } from './resources/popover.js';
export { PopUpButtonResourceClient } from './resources/popupbutton.js';
export { ProcessResourceClient } from './resources/process.js';
export { ProgressIndicatorResourceClient } from './resources/progressindicator.js';
export { RadioButtonResourceClient } from './resources/radiobutton.js';
export { RadioGroupResourceClient } from './resources/radiogroup.js';
export { RelevanceIndicatorResourceClient } from './resources/relevanceindicator.js';
export { RowResourceClient } from './resources/row.js';
export { ScrollAreaResourceClient } from './resources/scrollarea.js';
export { ScrollBarResourceClient } from './resources/scrollbar.js';
export { SheetResourceClient } from './resources/sheet.js';
export { SliderResourceClient } from './resources/slider.js';
export { SplitterResourceClient } from './resources/splitter.js';
export { SplitterGroupResourceClient } from './resources/splittergroup.js';
export { StaticTextResourceClient } from './resources/statictext.js';
export { TabGroupResourceClient } from './resources/tabgroup.js';
export { TableResourceClient } from './resources/table.js';
export { TextAreaResourceClient } from './resources/textarea.js';
export { TextFieldResourceClient } from './resources/textfield.js';
export { ToolbarResourceClient } from './resources/toolbar.js';
export { UIElementResourceClient } from './resources/uielement.js';
export { ValueIndicatorResourceClient } from './resources/valueindicator.js';
export { PropertyListItemResourceClient } from './resources/propertylistitem.js';
export { XMLAttributeResourceClient } from './resources/xmlattribute.js';
export { XMLDataResourceClient } from './resources/xmldata.js';
export { XMLElementResourceClient } from './resources/xmlelement.js';
export { ScriptingClassResourceClient } from './resources/scriptingclass.js';
export { ScriptingCommandResourceClient } from './resources/scriptingcommand.js';
export { ScriptingDefinitionObjectResourceClient } from './resources/scriptingdefinitionobject.js';
export { ScriptingElementResourceClient } from './resources/scriptingelement.js';
export { ScriptingEnumerationResourceClient } from './resources/scriptingenumeration.js';
export { ScriptingEnumeratorResourceClient } from './resources/scriptingenumerator.js';
export { ScriptingParameterResourceClient } from './resources/scriptingparameter.js';
export { ScriptingPropertyResourceClient } from './resources/scriptingproperty.js';
export { ScriptingSuiteResourceClient } from './resources/scriptingsuite.js';
