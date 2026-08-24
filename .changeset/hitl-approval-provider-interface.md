---
'@macts/core': minor
'@macts/api': minor
---

Add a provider-agnostic human-in-the-loop approval interface and wire the
confirm-first hold to it

Governance policy could already hold a `confirm-first` capability call, but
nothing could ask a human about it: the API server answered `202` with a
pending-approval body and the operation stayed withheld. macts now defines the
interface it owns for seeking a human decision, and concrete approval systems
plug in behind it.

`@macts/core` gains the approval seam: an `ApprovalProvider` receives a
decision-grade `ApprovalRequest` (permission, risk class, API-key identity,
redacted argument summary, the matched policy rule and its reason, a stable
request id, and the timeout) and answers `approved`, `rejected`, or `timeout`,
optionally attaching an opaque `evidence` artifact such as a signed verdict.
`seekApproval` bounds the wait and normalizes the answer fail-closed into a
discriminated `ApprovalOutcome`, so `approved: true` is inexpressible with a
denied state: only an explicit approval releases a call, while a rejection, a
timeout, a provider error, and a malformed response all deny. Because a
provider is third-party code, its returned `state`, `reason`, and any policy
suggestion are validated rather than trusted, and its exception text is kept
out of the client-facing `reason` (which names a stable failure category)
while the full detail travels on `auditReason` for the trail and server logs.
Providers declare `supportsPolicySuggestions` and `supportsDistinctRouting`;
both are reserved, and a policy suggestion from a provider that did not
declare support is dropped rather than forwarded.

`recordApprovalDecision` writes the resolution using the existing `approved` /
`rejected` audit vocabulary, so a held call leaves a `pending` record followed
by the decision that resolved it. Both records carry a shared `approvalId`, so
overlapping identical calls from the same key can still be paired. The writer
is required — there is no "decide but do not record" mode.

`@macts/api` wires this into `requirePolicy`. With an approval gate
configured, a `confirm-first` call asks the provider and awaits the decision
in-request within a bounded timeout: approved releases the call to the handler
and audits `approved`; rejected, timed out, or a failed provider denies with
`403 GOVERNANCE_APPROVAL_DENIED` (carrying the terminal state, narrowed to the
denied states, so a client can distinguish "declined" from "nobody answered")
and audits `rejected`. With no provider configured, the existing `202`
pending-approval behavior is unchanged.

A `confirm-first` operation can never execute unaudited. `GovernanceContext`
is now a union whose approvals arm requires an audit writer, so a context that
seeks approval with nowhere to record it does not type-check and
`loadApprovalGate` refuses to build one; and if the resolving audit write
fails at runtime anyway, the call is denied rather than released.

A provider is installed like any other macts plugin, into
`<macts-home>/plugins`, and is activated by naming it in
`<macts-home>/governance/approval.json` — explicit opt-in, because the
approval provider decides whether held calls run rather than adding capability
the way CLI and MCP plugins do. Its factory is looked up at the package's
`approval` subpath (a sibling of the established `cli` and `mcp` entry points)
and then at the package root. `loadApprovalGate` resolves and validates it; a
configured provider that cannot be loaded is a hard error rather than a silent
downgrade to "no approval channel".
