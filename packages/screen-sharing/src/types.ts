/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** A screen sharing connection */
export interface Connection {
  /** The connection name */
  name: string;
  /** The unique identifier of the connection */
  id: string;
  /** The VNC URL of the connection */
  url: string;
}

/** Input for creating a Connection */
export interface ConnectionCreateInput {
}

/** Input for updating a Connection */
export type ConnectionUpdateInput = Partial<ConnectionCreateInput>;

// Zod schemas for runtime validation

export const ConnectionSchema = z.object({
  name: z.string(),
  id: z.string(),
  url: z.string(),
});
