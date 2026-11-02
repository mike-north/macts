/**
 * Reading upload bytes from a caller-supplied source, with cancellation.
 *
 * An upload's bytes arrive as chunks from a Node.js stream (such as an
 * incoming HTTP request), a web `ReadableStream`, or any async iterable. The
 * reader yields each chunk as a `Uint8Array` and stops promptly when the
 * caller's signal aborts, even while the source is waiting for its next
 * chunk.
 *
 * A web stream is read through its reader rather than its async iterator:
 * the reader is typed the same way by every TypeScript version, while the
 * iterator's typing depends on the version of the Node.js type definitions.
 *
 * @packageDocumentation
 */

/**
 * The bytes of one upload, in order.
 *
 * @remarks
 * Every chunk must be a `Uint8Array` (a `Buffer` is one). Ending the source
 * completes the upload; a source that throws leaves it incomplete.
 */
export type UploadByteSource = AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>

/** The signal's abort reason as an `Error`; a non-Error reason is wrapped. */
function abortReason(signal: AbortSignal): Error {
  const reason: unknown = signal.reason
  return reason instanceof Error ? reason : new Error(String(reason))
}

/**
 * Wait for the iterator's next chunk, or reject with the signal's reason as
 * soon as it aborts.
 */
function nextChunk(
  iterator: AsyncIterator<unknown>,
  signal: AbortSignal | undefined
): Promise<IteratorResult<unknown>> {
  if (signal === undefined) {
    return iterator.next()
  }
  if (signal.aborted) {
    return Promise.reject(abortReason(signal))
  }
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      reject(abortReason(signal))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    iterator.next().then(
      (result) => {
        signal.removeEventListener('abort', onAbort)
        resolve(result)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    )
  })
}

/** An iterator over a web stream's chunks, through a reader that it locks. */
function readerIterator(stream: ReadableStream<Uint8Array>): AsyncIterator<unknown> {
  const reader = stream.getReader()
  return {
    async next(): Promise<IteratorResult<unknown>> {
      const result = await reader.read()
      return result.done ? { done: true, value: undefined } : { done: false, value: result.value }
    },
    async return(): Promise<IteratorResult<unknown>> {
      // Cancelling settles any pending read, then the lock is released.
      await reader.cancel()
      reader.releaseLock()
      return { done: true, value: undefined }
    },
  }
}

/** An iterator over any accepted byte source. */
function iteratorOf(source: UploadByteSource): AsyncIterator<unknown> {
  return 'getReader' in source ? readerIterator(source) : source[Symbol.asyncIterator]()
}

/**
 * Yield the source's chunks until it ends.
 *
 * @throws The signal's reason when it aborts, or the source's own error when
 *   it throws (a reason or thrown value that is not an `Error` may arrive
 *   wrapped in one), or a TypeError when a chunk is not a `Uint8Array`.
 *   On any early exit the source is told to stop (its `return()` is
 *   called) without waiting for it.
 */
export async function* readChunks(
  source: UploadByteSource,
  signal: AbortSignal | undefined
): AsyncGenerator<Uint8Array, void, undefined> {
  const iterator = iteratorOf(source)
  let finished = false
  try {
    for (;;) {
      const result = await nextChunk(iterator, signal)
      if (result.done === true) {
        finished = true
        return
      }
      const chunk = result.value
      if (!(chunk instanceof Uint8Array)) {
        throw new TypeError('Upload bytes must be Uint8Array chunks.')
      }
      yield chunk
    }
  } finally {
    if (!finished) {
      // Release the source without waiting: a source blocked on a read that
      // will never complete must not hold up the caller's cleanup.
      iterator.return?.().catch(() => undefined)
    }
  }
}
