/**
 * Type-level brand check, compiled against the installed packages: an
 * `Integer` from `@macts/sdk` is accepted where `@macts/sdk/local`'s `Integer`
 * is required, a plain number is not, and an error class from one entry point
 * is the same type as the other's.
 */

import type { Integer as RemoteInteger, TargetNotFoundError as RemoteNotFound } from '@macts/sdk'
import type {
  Integer as LocalInteger,
  TargetNotFoundError as LocalNotFound,
} from '@macts/sdk/local'

declare const fromRemote: RemoteInteger
declare const remoteError: RemoteNotFound

function acceptsLocalInteger(value: LocalInteger): number {
  return value
}
function acceptsLocalError(error: LocalNotFound): string {
  return error.code
}

acceptsLocalInteger(fromRemote)
acceptsLocalError(remoteError)
// @ts-expect-error a plain number is not an Integer
acceptsLocalInteger(7)
