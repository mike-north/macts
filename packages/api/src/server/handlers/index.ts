/**
 * Server handler exports.
 * @packageDocumentation
 */

export {
  createRpcRouter,
  createMultiAppRpcRouter,
  type RpcRequest,
  type RpcSuccessResponse,
  type RpcErrorResponse,
  type RpcHandler,
  type RpcHandlerContext,
  type RpcEndpointInfo,
} from './rpc.js'

export { buildCommandSchema, buildSchemaRegistry } from './validation.js'
