/**
 * Platform-neutral client composition for contract consumers. Codec validation,
 * canonical errors, reference authority, and HTTP transport are shared with the SDK.
 * The contracts root never imports this entry, and no native runtime is loaded.
 * @packageDocumentation
 */
export {
  createClient as createRemoteClient,
  createRemoteTransport,
  type RemoteClientOptions,
} from './remote.js'
export {
  bindReference,
  createCodecClient,
  type ClientTransport,
  type OperationTransport,
  type ResolutionTransport,
} from './codec-runtime.js'
