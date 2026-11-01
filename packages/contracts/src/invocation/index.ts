/**
 * Invocation context and token-derived authority.
 *
 * Every invocation, in either locality, carries the caller's credential. The
 * runtime is the only component that turns a credential into an
 * {@link Authority}: it verifies the credential, then checks permissions and
 * governance policy against that authority before any app work happens.
 * Adapters only translate their protocol's context into an
 * {@link InvocationContext}. Locality is never an alternative identity.
 *
 * @packageDocumentation
 */

/**
 * The secret a caller presents.
 *
 * @remarks
 * Implementations redact themselves in `toString`, `toJSON`, and inspection, so
 * a credential cannot leak into logs, errors, or audit records by accident.
 * `reveal()` is called only where the secret must be presented: verification,
 * or the `Authorization` header of a remote request.
 */
export interface Credential {
  /** How the secret is presented. */
  readonly scheme: 'bearer'
  /** Return the secret itself. */
  reveal(): string
}

/** What accompanies one invocation from a client or adapter to the runtime. */
export interface InvocationContext {
  /** The caller's credential, from which authority is derived. */
  readonly credential: Credential
  /** Abort the invocation. */
  readonly signal?: AbortSignal
  /** Caller-supplied identifier for correlating logs and audit records. */
  readonly correlationId?: string
}

/**
 * Who the caller is and what it may do, as established by verifying a
 * credential.
 *
 * @remarks
 * Never holds the secret. `subject` is the stable identity used for audit
 * attribution and for resolving identity-specific governance policy.
 */
export interface Authority {
  /** Stable identifier of the authenticated principal (the key id). */
  readonly subject: string
  /** Human-readable name of the principal, when one was assigned. */
  readonly displayName?: string
  /** Granted permission patterns (`app:resource:operation`, coarse, or wildcard). */
  readonly permissions: readonly string[]
  /** When the authority lapses, if it is time-limited. */
  readonly expiresAt?: Date
}
