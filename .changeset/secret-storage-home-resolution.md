---
'@macts/api': patch
'@macts/cli': patch
---

Resolve key/secret storage paths from `MACTS_HOME` (then `os.homedir()`), never a cwd-relative `./~/.macts`

API-key storage previously computed its directory as
`path.join(process.env['HOME'] ?? '~', '.macts')`. This had two problems:

- It ignored `MACTS_HOME`, so a custom install put plugins under `MACTS_HOME`
  but the JWT signing secret and `api-keys.db` under `$HOME/.macts` — a silent
  split-brain.
- When `HOME` was unset (cron, containers, CI, some service managers), the
  `?? '~'` fallback produced a **cwd-relative** `./~/.macts`, writing the
  signing secret (mode `0o600`) and key database wherever the process ran. Since
  that secret signs every API key, a predictable or shared location is an
  auth-bypass risk.

Storage now resolves its directory the same way plugin paths do — `MACTS_HOME`
when set, otherwise `~/.macts` via `os.homedir()` — so every macts surface
agrees on a single, absolute location. Secret-file (`0o600`) and directory
(`0o700`) permissions are unchanged. The same unsafe `process.env['HOME']`
pattern in the CLI's serve/manifest lookup and `service` commands has been
migrated to the same resolution (`os.homedir()` for fixed macOS paths such as
`~/Library/LaunchAgents`).
