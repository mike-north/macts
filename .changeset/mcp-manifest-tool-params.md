---
'@macts/mcp': patch
---

List the declared parameters of a manifest-registered operation in MCP `tools/list`.

A tool for an operation registered from a manifest alone used to list its input as a bare JSON record, with no `properties` and no `required`, even though a call is validated against the command's declared parameters. The adapter now renders the input side of the operation's wire contract, so the tool's `inputSchema` lists each declared parameter with its type, the required ones under `required`, and `additionalProperties: false`. Tools for contract-registered operations are unchanged, and capability discovery, which serves the same schemas, follows. An MCP client can now learn from the listing which arguments a manifest-served tool takes, which of them it must send, and that it accepts no others.
