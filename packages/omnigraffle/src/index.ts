/**
 * OmniGraffle HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { OmniGraffleClient } from '@macts/sdk-omnigraffle';
 *
 * const client = new OmniGraffleClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { OmniGraffleClient, OmniGraffleError, HttpClient } from './client.js'
export type { OmniGraffleClientOptions } from './client.js'
export * from './types.js'
export { CanvasResourceClient } from './resources/canvas.js'
export { GraphicResourceClient } from './resources/graphic.js'
export { ShapeResourceClient } from './resources/shape.js'
export { LineResourceClient } from './resources/line.js'
export { LayerResourceClient } from './resources/layer.js'
