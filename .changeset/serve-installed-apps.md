---
'@macts/cli': minor
'@macts/api': minor
---

`macts --serve` serves every installed app, validated against each app's contract

**`@macts/cli`**

- **Fixed:** `macts --serve` previously served only Calendar, from a manifest file it searched for in a few fixed places, and failed to start when it found none. It now serves every app whose server package is installed in the macts plugins directory (`macts mcp install <app>`), registered from that app's generated contract.
- Inputs are validated against each app's contract, which is stricter than before: an unknown field, or a value of the wrong type, is now rejected with 400 `VALIDATION_FAILED` before anything runs. Errors keep the same `{ "error": { code, message, details } }` envelope.
- At startup, `macts --serve` lists the apps it serves, any installed app that failed to load (with the reason), and any app installed without its server package (with the command that installs it). With no apps installed it still starts, says so, and serves no operations.

**`@macts/api`**

- `createServer`, `createMultiServer`, and `createApp` gain a `register` option, which registers apps from their generated contracts on the server's runtime before its routes are built: `register: (registrar) => registrar.registerContract(contract, manifest)`. Each contract is checked against its manifest, and its operations validate inputs against the contract's wire schemas. The registrar type is exported as `AppRegistrar`.
- Manifest registration (the `manifests` parameter) remains, as passthrough: operations carry no contract value types, and inputs are validated by each command's request schema.
- `/health` and `/api/v1` list every registered app, whether it was registered from a contract or a manifest.
