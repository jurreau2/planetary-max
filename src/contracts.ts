import type { KernelEnvelope, KernelResult, Bindings } from './types';

export type { KernelEnvelope, KernelResult, Bindings };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
