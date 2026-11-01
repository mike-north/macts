/**
 * The value-codec half of every client runtime, shared by the remote and local
 * clients.
 *
 * A client call has the same shape in both localities: encode the SDK input
 * through the operation's input contract, send the wire input somewhere that
 * runs the operation, and decode the wire result through the operation's output
 * contract. Only the middle step differs (an HTTP request, or the Mac-side
 * runtime). This module owns the two outer steps and the decode context, so
 * both clients validate at the same boundaries (phases/13 D11) and raise the
 * same canonical errors for the same failures:
 *
 * - an input that fails its contract raises `ValidationError` before anything
 *   is sent;
 * - a result that fails its contract raises `UnexpectedValueError`.
 *
 * It depends only on `@macts/contracts`, because the remote entry point uses it
 * and must never load the Mac-side runtime.
 *
 * @packageDocumentation
 */

import {
  InternalError,
  MactsError,
  UnexpectedValueError,
  ValidationError,
  type CallOptions,
  type ClientRuntime,
  type CodecResult,
  type DecodeContext,
  type OperationDescriptor,
  type OperationId,
  type WireValue,
} from '@macts/contracts'

/**
 * Runs one operation whose input is already in wire form and returns the raw
 * wire result.
 *
 * @remarks
 * The locality-specific step of a client call. It must throw only canonical
 * structured errors. The value it resolves to is untrusted: it is decoded and
 * validated against the operation's output contract before the caller sees it.
 */
export type OperationTransport = (
  operation: OperationId,
  input: WireValue,
  options: CallOptions | undefined
) => Promise<unknown>

/**
 * Build the decode context a client binds decoded values to.
 *
 * @remarks
 * This is the one place a client decides how references and file values in a
 * result become live objects. These clients do not support reference or file
 * values, so decoding one raises `InternalError` rather than producing an
 * object that cannot be resolved or fetched.
 */
function createDecodeContext(): DecodeContext {
  const unsupported = (kind: 'reference' | 'file'): never => {
    throw new InternalError(`This client does not support ${kind} values.`, {})
  }
  return {
    bindReference: () => unsupported('reference'),
    bindFile: () => unsupported('file'),
  }
}

/**
 * Run a codec, turning anything it throws into `InternalError`.
 *
 * @remarks
 * Codecs report invalid values as a failed result and are not expected to
 * throw. A throw is a defect in the contract, except a canonical error raised
 * on purpose (such as the decode context's unsupported-value error), which
 * passes through unchanged.
 */
function runCodec<T>(
  operation: OperationId,
  stage: 'input' | 'result',
  codec: () => CodecResult<T>
): CodecResult<T> {
  try {
    return codec()
  } catch (error) {
    if (error instanceof MactsError) {
      throw error
    }
    throw new InternalError(
      `The ${stage} contract of "${operation}" failed unexpectedly.`,
      {},
      {
        cause: error,
      }
    )
  }
}

/**
 * Encode an SDK input through the operation's input contract.
 *
 * @throws `ValidationError` listing every issue when the input violates the
 *   contract.
 */
function encodeInput<Input>(
  operation: OperationDescriptor<Input, unknown>,
  input: Input
): WireValue {
  const encoded = runCodec(operation.id, 'input', () => operation.input.encode(input))
  if (!encoded.ok) {
    throw new ValidationError(`The input to "${operation.id}" failed validation.`, {
      issues: encoded.issues,
    })
  }
  return encoded.value
}

/**
 * Decode a wire result through the operation's output contract.
 *
 * @throws `UnexpectedValueError` listing every issue when the result violates
 *   the contract.
 */
function decodeOutput<Output>(
  operation: OperationDescriptor<unknown, Output>,
  wire: unknown,
  context: DecodeContext
): Output {
  const decoded = runCodec(operation.id, 'result', () => operation.output.decode(wire, context))
  if (!decoded.ok) {
    throw new UnexpectedValueError(`The result of "${operation.id}" does not match its contract.`, {
      issues: decoded.issues,
    })
  }
  return decoded.value
}

/**
 * Build a client runtime that encodes inputs, hands them to `transport`, and
 * decodes the results.
 *
 * @param transport - The locality-specific step that runs an operation.
 * @returns The runtime a generated contract's `bind` turns into an app client.
 */
export function createCodecClientRuntime(transport: OperationTransport): ClientRuntime {
  const decodeContext = createDecodeContext()
  return {
    async invoke<Input, Output>(
      operation: OperationDescriptor<Input, Output>,
      input: Input,
      options?: CallOptions
    ): Promise<Output> {
      const wire = encodeInput(operation, input)
      const result = await transport(operation.id, wire, options)
      return decodeOutput(operation, result, decodeContext)
    },
  }
}
