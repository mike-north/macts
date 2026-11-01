/**
 * The runtime's concrete credential holder.
 *
 * A credential travels with every invocation, so it passes through code that
 * logs, serializes, and formats values for diagnostics. The holder here makes
 * every one of those paths safe by construction: the secret lives in a private
 * class field that no reflection, enumeration, or serialization can reach, and
 * every stringification and inspection hook returns a fixed placeholder. The
 * only way to obtain the secret is to call `reveal()`, which happens solely
 * where the secret must be presented (verification, or a remote
 * `Authorization` header).
 *
 * @packageDocumentation
 */

import type { Credential } from '@macts/contracts'

/** What a credential renders as anywhere other than `reveal()`. */
const REDACTED_CREDENTIAL = '[redacted credential]'

/** Node's inspection hook, so `util.inspect` and `console.log` show the placeholder. */
const INSPECT_CUSTOM = Symbol.for('nodejs.util.inspect.custom')

/**
 * A bearer secret that redacts itself everywhere except `reveal()`.
 *
 * @remarks
 * Not exported: callers obtain instances through
 * {@link createBearerCredential} and see only the `Credential` contract.
 */
class BearerCredential implements Credential {
  readonly scheme = 'bearer'
  readonly #secret: string

  constructor(secret: string) {
    this.#secret = secret
  }

  reveal(): string {
    return this.#secret
  }

  toString(): string {
    return REDACTED_CREDENTIAL
  }

  toJSON(): string {
    return REDACTED_CREDENTIAL
  }

  [INSPECT_CUSTOM](): string {
    return REDACTED_CREDENTIAL
  }
}

/**
 * Wrap a bearer secret (such as a `macts_sk_` API key) in a self-redacting
 * `Credential`.
 *
 * @remarks
 * `String(credential)`, template literals, `JSON.stringify`, `util.inspect`,
 * and `Object.keys` never expose the secret; only `reveal()` returns it. An
 * empty secret is accepted here and rejected at verification as a missing
 * credential, so "no credential" has one representation and one failure.
 *
 * @param secret - The secret exactly as the caller presented it.
 * @returns A credential that presents `secret` under the bearer scheme.
 */
export function createBearerCredential(secret: string): Credential {
  return new BearerCredential(secret)
}
