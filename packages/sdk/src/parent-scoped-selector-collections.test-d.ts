/**
 * Type tests for the resources an app lists only within a parent while
 * getting a single one at the application: a selector collection of every
 * object (`by: 'every'`) does not type-check as reference data without an
 * identity reference to the parent as its container, and does with one.
 *
 * phases/13 D7, "Parent-scoped targets": a selector collection takes the
 * `list` parent. One explicit case per resource, in the same hand-audited
 * order as the pins of `e2e/mcp-contracts/src/parent-scoped-pins.ts`
 * (Reminders and Microsoft Edge tabs are also covered, through
 * `bindReference`, by `parent-scoped-reference.test-d.ts`).
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D7
 */

import { expectAssignable, expectNotAssignable } from 'tsd'
import type { ResolvableReferenceData } from '@macts/contracts'
import type { AutomatorResources } from '@macts/automator/contract'
import type { MicrosoftEdgeResources } from '@macts/microsoft-edge/contract'
import type { OmniGraffleResources } from '@macts/omnigraffle/contract'
import type { RemindersResources } from '@macts/reminders/contract'
import type { XcodeResources } from '@macts/xcode/contract'

/** Every object of `resource`, with no container. */
function every<const App extends string, const Resource extends string>(
  app: App,
  resource: Resource
) {
  return {
    app,
    resource,
    form: 'selector',
    cardinality: 'many',
    selector: { by: 'every' },
  } as const
}

/** Every object of `resource`, within the `parent` whose identifier is `'P1'`. */
function within<
  const App extends string,
  const Resource extends string,
  const Parent extends string,
>(app: App, resource: Resource, parent: Parent) {
  return {
    ...every(app, resource),
    container: { app, resource: parent, form: 'identity', cardinality: 'one', id: 'P1' },
  } as const
}

// Automator
expectNotAssignable<ResolvableReferenceData<AutomatorResources>>(
  every('automator', 'AutomatorAction')
)
expectAssignable<ResolvableReferenceData<AutomatorResources>>(
  within('automator', 'AutomatorAction', 'Workflow')
)
expectNotAssignable<ResolvableReferenceData<AutomatorResources>>(every('automator', 'Variable'))
expectAssignable<ResolvableReferenceData<AutomatorResources>>(
  within('automator', 'Variable', 'Workflow')
)
expectNotAssignable<ResolvableReferenceData<AutomatorResources>>(every('automator', 'Setting'))
expectAssignable<ResolvableReferenceData<AutomatorResources>>(
  within('automator', 'Setting', 'AutomatorAction')
)
expectNotAssignable<ResolvableReferenceData<AutomatorResources>>(
  every('automator', 'RequiredResource')
)
expectAssignable<ResolvableReferenceData<AutomatorResources>>(
  within('automator', 'RequiredResource', 'AutomatorAction')
)

// Microsoft Edge
expectNotAssignable<ResolvableReferenceData<MicrosoftEdgeResources>>(every('microsoft-edge', 'Tab'))
expectAssignable<ResolvableReferenceData<MicrosoftEdgeResources>>(
  within('microsoft-edge', 'Tab', 'Window')
)
expectNotAssignable<ResolvableReferenceData<MicrosoftEdgeResources>>(
  every('microsoft-edge', 'BookmarkItem')
)
expectAssignable<ResolvableReferenceData<MicrosoftEdgeResources>>(
  within('microsoft-edge', 'BookmarkItem', 'BookmarkFolder')
)

// OmniGraffle
expectNotAssignable<ResolvableReferenceData<OmniGraffleResources>>(every('omnigraffle', 'Graphic'))
expectAssignable<ResolvableReferenceData<OmniGraffleResources>>(
  within('omnigraffle', 'Graphic', 'Canvas')
)
expectNotAssignable<ResolvableReferenceData<OmniGraffleResources>>(every('omnigraffle', 'Shape'))
expectAssignable<ResolvableReferenceData<OmniGraffleResources>>(
  within('omnigraffle', 'Shape', 'Canvas')
)
expectNotAssignable<ResolvableReferenceData<OmniGraffleResources>>(every('omnigraffle', 'Line'))
expectAssignable<ResolvableReferenceData<OmniGraffleResources>>(
  within('omnigraffle', 'Line', 'Canvas')
)
expectNotAssignable<ResolvableReferenceData<OmniGraffleResources>>(every('omnigraffle', 'Layer'))
expectAssignable<ResolvableReferenceData<OmniGraffleResources>>(
  within('omnigraffle', 'Layer', 'Canvas')
)

// Reminders
expectNotAssignable<ResolvableReferenceData<RemindersResources>>(every('reminders', 'Reminder'))
expectAssignable<ResolvableReferenceData<RemindersResources>>(
  within('reminders', 'Reminder', 'List')
)

// Xcode
expectNotAssignable<ResolvableReferenceData<XcodeResources>>(every('xcode', 'Project'))
expectAssignable<ResolvableReferenceData<XcodeResources>>(
  within('xcode', 'Project', 'WorkspaceDocument')
)
expectNotAssignable<ResolvableReferenceData<XcodeResources>>(every('xcode', 'Scheme'))
expectAssignable<ResolvableReferenceData<XcodeResources>>(
  within('xcode', 'Scheme', 'WorkspaceDocument')
)
expectNotAssignable<ResolvableReferenceData<XcodeResources>>(every('xcode', 'RunDestination'))
expectAssignable<ResolvableReferenceData<XcodeResources>>(
  within('xcode', 'RunDestination', 'WorkspaceDocument')
)
