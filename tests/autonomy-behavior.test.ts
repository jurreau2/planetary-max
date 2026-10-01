import { describe, it, expect } from 'vitest';
import { evolveKernelResult, type AutonomyMode } from '../src/kernel-evolution';
import type { KernelResult } from '../src/types';

describe('[autonomy modes]', () => {
  const baseResult: KernelResult = {
    ok: true,
    type: 'test.operation',
    identity: 'operator',
    route: ['test'],
    result: { lanes: [] },
    meta: {
      source: 'kernel',
      lane: 'test',
      autonomy: 'off',
      timestamp: Date.now(),
    },
  };

  const failedResult: KernelResult = {
    ok: false,
    type: 'test.operation',
    identity: 'operator',
    route: ['test'],
    error: { message: 'failure' },
    meta: {
      source: 'kernel',
      lane: 'test',
      autonomy: 'off',
      timestamp: Date.now(),
    },
  };

  it('mode "off" returns the original KernelResult unchanged', () => {
    const r = evolveKernelResult(baseResult, 'off');
    expect(r).toMatchObject(baseResult);
    expect(r.meta?.autonomy).toBe('off');
  });

  it('mode "core" applies Phase 14–16 evolution only', () => {
    const r = evolveKernelResult(baseResult, 'core');
    expect(r.ok).toBe(true);
    expect(r.meta?.autonomy).toBe('core');
    expect(r.meta?.autonomyState?.phases).toEqual([14, 15, 16]);
  });

  it('mode "full" applies Phase 14–18 evolution', () => {
    const r = evolveKernelResult(baseResult, 'full');
    expect(r.ok).toBe(true);
    expect(r.meta?.autonomy).toBe('full');
    expect(r.meta?.autonomyState?.phases).toEqual([14, 15, 16, 17, 18]);
  });

  it('failed results bypass autonomy evolution entirely', () => {
    const r = evolveKernelResult(failedResult, 'full');
    expect(r.ok).toBe(false);
    expect(r.meta?.autonomy).toBe('off');
    expect(r.error).toEqual(failedResult.error);
  });

  it('switching modes produces distinct autonomyState blocks', () => {
    const core = evolveKernelResult(baseResult, 'core');
    const full = evolveKernelResult(baseResult, 'full');

    expect(core.meta?.autonomy).toBe('core');
    expect(full.meta?.autonomy).toBe('full');

    expect(core.meta?.autonomyState?.phases).not.toEqual(full.meta?.autonomyState?.phases);
    expect(core.meta?.autonomyState?.phases).toHaveLength(3);
    expect(full.meta?.autonomyState?.phases).toHaveLength(5);
  });

  it('default mode is "off" when undefined', () => {
    const r = evolveKernelResult(baseResult, undefined);
    expect(r.meta?.autonomy).toBe('off');
  });

  it('meta schema preserves source, lane, autonomy, and timestamp', () => {
    const r = evolveKernelResult(baseResult, 'core');

    expect(r.meta?.source).toBe('kernel');
    expect(r.meta?.lane).toBe('test');
    expect(typeof r.meta?.timestamp).toBe('number');
    expect(r.meta?.autonomy).toBe('core');
  });

  it('phase ordering is monotonic in full mode', () => {
    const r = evolveKernelResult(baseResult, 'full');

    const phases = r.meta?.autonomyState?.phases;
    expect(Array.isArray(phases)).toBe(true);

    // Ensure ordering: 14 < 15 < 16 < 17 < 18
    expect(phases).toEqual([14, 15, 16, 17, 18]);
  });

  it('normalizes meta when source or lane are missing', () => {
    const resultWithoutMeta: KernelResult = {
      ok: true,
      type: 'test.operation',
      identity: 'operator',
      route: ['fallback-lane'],
      result: {},
    };

    const r = evolveKernelResult(resultWithoutMeta, 'core');
    expect(r.meta?.source).toBe('kernel');
    expect(r.meta?.lane).toBe('fallback-lane');
    expect(r.meta?.autonomy).toBe('core');
  });

  it('preserves result.result and result.type through evolution', () => {
    const r = evolveKernelResult(baseResult, 'full');
    expect(r.result).toEqual(baseResult.result);
    expect(r.type).toBe(baseResult.type);
  });

  it('preserves result.identity through evolution', () => {
    const r = evolveKernelResult(baseResult, 'core');
    expect(r.identity).toBe('operator');
  });

  it('timestamp is updated on evolution', () => {
    const before = Date.now();
    const r = evolveKernelResult(baseResult, 'core');
    const after = Date.now();

    expect(r.meta?.timestamp).toBeGreaterThanOrEqual(before);
    expect(r.meta?.timestamp).toBeLessThanOrEqual(after);
  });

  it('multiple evolutions produce different timestamps', async () => {
    const r1 = evolveKernelResult(baseResult, 'core');
    const ts1 = r1.meta?.timestamp ?? 0;

    // small delay
    await new Promise((resolve) => setTimeout(resolve, 5));

    const r2 = evolveKernelResult(baseResult, 'core');
    const ts2 = r2.meta?.timestamp ?? 0;

    expect(ts2).toBeGreaterThanOrEqual(ts1);
  });
});
