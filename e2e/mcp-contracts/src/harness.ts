/**
 * Fakes for the MCP contract-tools integration tests.
 *
 * The tests run a real runtime over real app contracts; only the parts that
 * would need a Mac or a key store are replaced. The executor records what the
 * runtime hands it instead of automating an app, the verifier recognizes a
 * fixed set of secrets instead of reading the key store, and the logger keeps
 * expected failures out of the test output.
 */

import type { ExecutionRequest, Executor } from '@macts/core'
import {
  AuthenticationError,
  type Authority,
  type Credential,
  type WireValue,
} from '@macts/contracts'
import type { CredentialVerifier, RuntimeLogger } from '@macts/runtime'

/** An executor that records every request and answers with `respond`. */
export interface RecordingExecutor extends Executor {
  /** Every request received, in order. */
  readonly requests: ExecutionRequest[]
}

/** Build a {@link RecordingExecutor}. */
export function createRecordingExecutor(
  respond: (request: ExecutionRequest) => Promise<WireValue> = () => Promise.resolve(null)
): RecordingExecutor {
  const requests: ExecutionRequest[] = []
  return {
    provider: 'recording-stub',
    requests,
    execute(request) {
      requests.push(request)
      return respond(request)
    },
  }
}

/**
 * A verifier that recognizes a fixed set of secrets.
 *
 * @remarks
 * An empty secret is `missing` and an unrecognized one is `invalid`, the
 * reasons the key-store verifier gives, without a key store.
 */
export function createFakeVerifier(
  authorities: Readonly<Record<string, Authority>>
): CredentialVerifier {
  return {
    verify(credential: Credential) {
      const secret = credential.reveal()
      if (secret.length === 0) {
        return Promise.reject(
          new AuthenticationError('No credential was presented.', { reason: 'missing' })
        )
      }
      const authority = Object.hasOwn(authorities, secret) ? authorities[secret] : undefined
      return authority === undefined
        ? Promise.reject(
            new AuthenticationError('The credential could not be verified.', { reason: 'invalid' })
          )
        : Promise.resolve(authority)
    },
  }
}

/** A logger that discards every entry. */
export function createSilentLogger(): RuntimeLogger {
  const discard = (): void => undefined
  return { error: discard, warn: discard, info: discard }
}
