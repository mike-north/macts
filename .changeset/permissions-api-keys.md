---
'@macts/core': minor
'@macts/api': minor
---

Add two-layer permissions system and JWT-based API key management

**@macts/core - Permissions System:**

- Fine-grained permissions (one per command): `app:resource:operation`
- Coarse-grained permissions (CRUD-style groups): `app:resource:read`
- Wildcard permissions for broad grants: `app:*:read`, `app:resource:*`
- Permission parsing, expansion, and matching utilities
- Permission history tracking for helpful upgrade error messages
- Manifest schema updates to support `permission` field on commands and `permissions` section for coarse-to-fine mappings

**@macts/api - API Key Management:**

- JWT-based API key generation with HMAC-SHA256 signatures
- Token format: `macts_sk_<jwt>` for easy identification
- Permission expansion at key creation time (coarse/wildcard → fine-grained)
- Key metadata storage with revocation support
- Secure secret storage in `~/.macts/secrets/` with proper file permissions
- Environment variable override: `MACTS_API_KEY_SECRET`
- Validation utilities with detailed error codes

**Key Features:**

- Coarse permissions expand at creation, not validation (security: new permissions require new keys)
- Permission history provides actionable error messages when requirements change
- Keys store only fine-grained permissions for precise access control
- Helper functions for common patterns: `createFullAccessKey()`, `createReadOnlyKey()`
