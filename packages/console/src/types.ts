/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** A device in Console */
export interface Device {
  /** The device name */
  name: string;
  /** The unique identifier of the device */
  id: string;
}

/** Input for creating a Device */
export interface DeviceCreateInput {
}

/** Input for updating a Device */
export type DeviceUpdateInput = Partial<DeviceCreateInput>;

// Zod schemas for runtime validation

export const DeviceSchema = z.object({
  name: z.string(),
  id: z.string(),
});
