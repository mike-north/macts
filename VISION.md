# macts Pivot Memo: From macOS Automation SDKs to Trusted Agent Automation Infrastructure

**Date:** June 14, 2026  
**Repo:** `mike-north/macts`  
**Working thesis:** macts should evolve from “TypeScript SDKs for macOS app automation” into a trusted local automation substrate that lets AI agents discover, compose, permission, reuse, and govern structured automations across desktop apps.

---

## 1. The core idea

AI agents are increasingly able to operate computers directly: clicking, typing, reading screens, navigating local files, and interacting with desktop apps. That capability is powerful, but it is also inefficient, brittle, and hard to govern.

The important shift is this:

> Agents should not repeatedly drive user interfaces when they can instead compose durable, permissioned, application-level automations.

macts is well-positioned to become that layer on macOS.

Instead of having an agent repeatedly inspect pixels, infer UI structure, and click through an app, macts can expose typed, semantically meaningful interfaces over native macOS applications. The agent works with concepts like calendars, events, reminders, tasks, documents, windows, files, messages, and projects—not vague UI elements.

This turns automation from:

> “The agent figures out how to use the app every time.”

into:

> “The agent discovers or creates a stable capability, gets it permissioned, and reuses it safely.”

---

## 2. What macts is today

macts currently presents itself as TypeScript SDKs for macOS app automation. It provides:

- Type-safe APIs for macOS applications.
- A local HTTP API server that executes JXA / AppleScript.
- Multiple interfaces: SDK, CLI, and MCP.
- Manifest-driven app definitions with generated packages.
- App-specific packages for Calendar, Contacts, Finder, Mail, Messages, Notes, Reminders, Shortcuts, Terminal, System Settings, browsers, OmniFocus, Xcode, and others.
- API-key-based permissions using an `app:resource:operation` model.

That is already a strong foundation. The pivot is not a rewrite. It is a reframing and expansion of what the system is for.

Today, the README describes macts mainly as a developer automation SDK. The sharper opportunity is to frame it as infrastructure for AI agents that need safe, efficient, structured ways to interact with local applications.

---

## 3. The pivot

### Current framing

> TypeScript SDKs for macOS app automation.

### Stronger framing

> A trusted local automation layer that lets AI agents and developer tools safely operate macOS apps through typed, permissioned, reusable capabilities.

### Even sharper product sentence

> macts turns scriptable macOS apps into secure, typed, agent-ready APIs.

This matters because the agent ecosystem is moving toward local computer use, but “computer use” by itself is a blunt instrument. It is expensive in tokens, fragile under UI changes, hard to audit, and uncomfortable for enterprise security teams.

macts can offer the better path: structured automation with explicit permissions.

---

## 4. Load-bearing principles

### 4.1 Agents should graduate from UI driving to API composition

UI driving is useful as a universal fallback, but it should not be the preferred path for repeatable work.

A good agent should ask:

1. Is this a one-off task where direct interaction is fine?
2. Is this a recurring pattern worth turning into a reusable automation?
3. Is there already a typed app capability available?
4. Can I safely request a narrow permission and then reuse it?

The long-term agent skill is not just “perform the task.” It is deciding when to invest in a toolpath.

### 4.2 macOS has a unique advantage

macOS is unusually well-suited to this because of AppleScript, JXA, and application scripting dictionaries.

Those dictionaries are effectively app-level schemas. They expose structured concepts and operations that an agent can use directly rather than blindly manipulating the UI.

Windows has automation surfaces, but they are less uniformly app-semantic out of the box. Linux often leans more naturally on CLIs and files. macOS has a distinctive middle ground: many rich GUI apps have scriptable object models.

macts should lean hard into this advantage.

### 4.3 Permissions should be capability-scoped, not screen-scoped

A security team is much more likely to approve:

```text
calendar:events:create
reminders:tasks:list
finder:files:read
omnifocus:tasks:create
```

than:

```text
Let the AI control my computer.
```

The trust model should be based on specific, understandable capabilities.

This is the difference between broad ambient power and narrow intentional delegation.

### 4.4 The trusted path should also be the easiest path

Security systems work best when the safe path is easier than the unsafe path.

If macts gives agents a simple way to discover, request, and call structured app capabilities, agents will naturally prefer it over brittle UI control.

The system should make this true:

> The most reliable way to complete the task is also the most governable way.

### 4.5 Automation should become reusable agent memory

Agents should not merely complete tasks. They should accumulate operational leverage.

When an agent notices that the user repeatedly asks for similar workflows, it should be able to propose or create a durable automation pathway:

- A script.
- A CLI command.
- An MCP tool.
- A generated SDK wrapper.
- A named local capability.
- A permissioned “recipe” that can be inspected and approved.

This is different from storing conversational memory. It is storing executable, governed capability.

---

## 5. Why this matters for agents

### 5.1 Token efficiency

Direct computer use burns tokens because the agent must repeatedly observe, reason, and act through a high-entropy interface.

A typed automation path compresses the interaction.

Instead of:

1. Inspect the screen.
2. Identify the app.
3. Find the button.
4. Click.
5. Observe.
6. Type.
7. Observe again.
8. Infer success.

The agent can call:

```ts
await calendar.events.create({
  summary: 'Team Meeting',
  startDate,
  endDate,
  attendees,
})
```

That is cheaper, clearer, and easier to validate.

### 5.2 Reliability

UI automation is fragile because apps change their visual layout, focus state, accessibility labels, and menu structure.

Scriptable app models are more durable. They are closer to the domain model of the application.

For agents, this means fewer false starts, fewer retries, and fewer cases where the agent confidently clicks the wrong thing.

### 5.3 Better context boundaries

A UI-driving agent often needs broad observational context. It may need to inspect windows, screen contents, nearby documents, or app state.

A structured automation layer can expose exactly what is needed.

For example, the agent may need permission to list calendar names and create events. It does not need general screen-reading access.

That reduces accidental overexposure of sensitive information.

### 5.4 Stronger auditability

A typed capability call is much easier to log and explain than a stream of clicks.

Audit logs can say:

```text
2026-06-14 10:42:12
Agent used calendar:events:create
Calendar: Work
Summary: Team Meeting
Attendees: 3
Approved by API key: assistant-calendar-writer
```

That is exactly the kind of surface enterprise teams need.

---

## 6. Enterprise trust model

The enterprise version of this story is especially strong.

Companies do not necessarily object to automation. They object to automation they cannot bound, inspect, approve, or revoke.

macts can provide a model where IT and security teams define:

- Which apps are scriptable.
- Which operations are allowed.
- Which URL patterns are blocked.
- Which local paths are off-limits.
- Which apps are no-go zones.
- Which agents or API keys can access which capabilities.
- Which actions require approval.
- Which actions are fully disabled.
- Which actions are logged.

This creates trusted islands of automation.

Within those islands, agents can operate freely and efficiently. Outside those islands, they cannot act without explicit expansion of scope.

That is much more acceptable than granting a general-purpose AI system permission to control the whole desktop.

---

## 7. Product architecture direction

macts already has a promising architecture:

```text
SDK / CLI / MCP
      ↓
Local HTTP API server
      ↓
API-key validation
      ↓
Permission checking
      ↓
JXA / AppleScript execution
      ↓
macOS applications
```

The pivot suggests extending this into a more explicit agent automation platform.

### 7.1 Capability registry

Create a local registry of available capabilities:

```text
calendar.events.list
calendar.events.create
reminders.lists.list
reminders.tasks.create
finder.files.search
omnifocus.tasks.create
xcode.projects.open
```

Each capability should have:

- A stable name.
- Input schema.
- Output schema.
- Required permissions.
- Safety notes.
- App dependency.
- Whether it reads, writes, deletes, sends, executes, or changes system state.

### 7.2 Discovery interface for agents

Agents need a way to ask:

- What apps are installed?
- Which apps are scriptable?
- Which capabilities exist?
- Which permissions are already granted?
- Which permissions could be requested?
- Which capabilities are recommended for this task?

This should be available through MCP and CLI.

Example:

```bash
macts capabilities search calendar event create
macts capabilities inspect calendar.events.create
macts permissions explain calendar:events:create
```

### 7.3 Permission negotiation

macts should make permission requests understandable to humans.

Instead of showing a raw scope only, it should explain:

```text
The assistant wants permission to create Calendar events.
It will not be able to read existing event details, delete events, invite attendees unless separately granted, or access Mail.
```

The API key model is already a good foundation. The next step is to make permission negotiation a first-class user and enterprise experience.

### 7.4 Reusable recipes

A recipe is a named, inspectable workflow composed from one or more capabilities.

Example:

```yaml
name: prepare-meeting-brief
uses:
  - calendar:events:list
  - contacts:contacts:read
  - notes:notes:create
requires_approval: false
```

Recipes give agents a way to convert repeated work into durable automation.

They also give security teams a reviewable artifact.

### 7.5 Generated MCP tools

macts should treat MCP not only as an integration surface, but as a generated agent interface.

From manifests, generate:

- TypeScript SDKs.
- CLI commands.
- HTTP endpoints.
- MCP tools.
- Permission documentation.
- Audit metadata.

This keeps the system coherent. One manifest becomes every interface.

---

## 8. Browser and web extension angle

The same idea can eventually apply to web apps, but the mechanism is different.

For macOS apps, macts can use AppleScript / JXA and scripting dictionaries.

For browsers, a structured Chrome extension could expose higher-level browser and web-app capabilities:

- Current tab metadata.
- URL allow / deny policy.
- DOM extraction under policy.
- Form-fill actions.
- Page-specific adapters.
- Site-specific tools.
- Enterprise-controlled web boundaries.

The key idea remains the same:

> Do not make the agent infer everything from pixels when a structured, governed interface can exist.

macts can begin with native macOS apps and later grow into a broader local automation control plane.

---

## 9. How agents should use macts

The agent behavior model should be explicit.

### 9.1 One-off work

If the task is unusual, low-risk, and unlikely to repeat, the agent can use general computer control or ad hoc execution.

### 9.2 Existing capability

If macts already exposes the right capability, the agent should prefer it.

Example:

> User asks: “Put lunch with Sarah on my calendar tomorrow at noon.”

Agent path:

1. Discover calendar event creation capability.
2. Check whether `calendar:events:create` is granted.
3. If not, request that narrow permission.
4. Create the event.
5. Report success.

### 9.3 Repeated workflow

If the user repeatedly asks for a similar workflow, the agent should propose turning it into a recipe.

Example:

> “Every Friday, create a planning note from my calendar and reminders.”

Agent path:

1. Identify required app capabilities.
2. Generate a recipe.
3. Explain the required permissions.
4. Ask for approval.
5. Store the recipe locally.
6. Reuse it going forward.

### 9.4 Missing capability

If macts does not expose the needed operation, the agent can:

1. Inspect the app scripting dictionary.
2. Propose a new manifest entry.
3. Generate the SDK / CLI / MCP binding.
4. Test it.
5. Request permission.
6. Add it to the local toolbelt.

This is where the project becomes especially interesting: agents can help grow their own safe automation surface.

---

## 10. Security posture

The security story should be direct and opinionated.

macts should not be “remote control for your Mac.”

It should be:

> A local, permission-scoped capability broker for scriptable applications.

Important properties:

- Local-first execution.
- No cloud dependency required for automation.
- Narrow API keys.
- Explicit read/write/delete/send/execute distinctions.
- Human-readable permission explanations.
- Enterprise allowlists and denylists.
- Audit logs.
- Revocation.
- Optional approval gates for sensitive operations.
- No ambient access to arbitrary apps by default.

Sensitive operations should be clearly marked:

- Sending emails or messages.
- Deleting files.
- Running shell commands.
- Modifying system settings.
- Accessing private documents.
- Exporting contacts.
- Reading message history.
- Acting in browsers on sensitive domains.

The project should bias toward narrow default access and explicit escalation.

---

## 11. Strategic positioning

### 11.1 Developer positioning

For developers:

> Build macOS automations with typed APIs instead of brittle scripts.

### 11.2 Agent positioning

For AI assistants:

> Give agents safe, structured tools for local apps instead of making them click around.

### 11.3 Enterprise positioning

For enterprises:

> Let employees benefit from AI desktop automation while security teams retain clear boundaries, logs, and controls.

### 11.4 Platform positioning

For the broader ecosystem:

> macts is the missing control plane between AI agents and macOS applications.

---

## 12. Suggested README reframing

A stronger opening could be:

```markdown
# macts

macts turns scriptable macOS apps into secure, typed, agent-ready APIs.

It provides TypeScript SDKs, CLI commands, HTTP endpoints, and MCP tools for controlling native macOS applications through a local permissioned automation server. Instead of relying on brittle UI automation, agents and developer tools can interact with real app concepts like calendar events, reminders, files, messages, notes, tasks, projects, and windows.

Use macts to build local automations, give AI assistants scoped access to desktop apps, and create reusable workflows that are inspectable, auditable, and safe to approve.
```

---

## 13. Possible roadmap

### Phase 1: Clarify the foundation

- Reframe README around “agent-ready APIs for macOS apps.”
- Strengthen explanation of local API server and permission model.
- Make MCP integration more prominent.
- Add an “AI agent use cases” section.
- Add a “Security model” section.

### Phase 2: Capability discovery

- Add `macts capabilities list`.
- Add `macts capabilities inspect <capability>`.
- Add machine-readable metadata for read/write/delete/send/execute risk levels.
- Expose discovery through MCP.

### Phase 3: Permission UX

- Add human-readable permission explanations.
- Add permission request / approval flow.
- Add scoped API-key templates.
- Add audit logging for capability calls.

### Phase 4: Recipes

- Introduce local reusable workflow recipes.
- Allow recipes to declare required permissions.
- Generate CLI and MCP entry points for recipes.
- Add recipe inspection and signing / approval metadata.

### Phase 5: Agent-assisted manifest expansion

- Let agents inspect app dictionaries.
- Generate proposed manifest entries.
- Generate tests.
- Create PRs for new app capabilities.
- Support local private capabilities before upstreaming.

### Phase 6: Enterprise controls

- Add org-level policy files.
- Add app allowlists / denylists.
- Add URL and path restrictions.
- Add operation-level approval gates.
- Add SIEM-friendly audit export.

### Phase 7: Browser extension path

- Explore Chrome / Safari extension bridge.
- Add browser capability registry.
- Support URL-scoped policies.
- Add web-app-specific adapters where appropriate.

---

## 14. The deeper thesis

The long-term opportunity is not just automating macOS apps.

The deeper thesis is that agents need governed operational interfaces.

Raw computer use gives agents reach. macts gives them shape.

The winning pattern is likely hybrid:

- Use general computer control as fallback and exploration.
- Use app dictionaries and manifests to discover structured interfaces.
- Promote repeated tasks into typed capabilities or recipes.
- Put narrow permissions and audit logs around those capabilities.
- Make the safe path the efficient path.

That is the pivot:

> macts becomes the local capability layer where AI agents stop merely operating the computer and start building a trusted automation toolbelt.

---

## 15. One-line summary

macts should become the trusted local automation substrate for AI agents on macOS: typed, permissioned, discoverable, reusable, and enterprise-governable.
