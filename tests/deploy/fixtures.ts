import type { D1DatabaseBinding, D1PreparedBinding } from '../../src/bindings/d1.ts';
import type { KVNamespaceBinding } from '../../src/bindings/kv.ts';
import type { R2BucketBinding, R2ListResult, R2ObjectBodyReference, R2ObjectReference } from '../../src/bindings/r2.ts';
import type { DeploymentBindings, KernelServiceBinding } from '../../src/deploy/readiness.ts';

export class MemoryR2 implements R2BucketBinding {
  readonly objects = new Map<string, string>();
  putCount = 0;

  async head(key: string): Promise<R2ObjectReference | null> {
    return this.objects.has(key) ? { key } : null;
  }

  async get(key: string): Promise<R2ObjectBodyReference | null> {
    const value = this.objects.get(key);
    return value === undefined ? null : { key, text: async () => value };
  }

  async put(key: string, value: string): Promise<unknown> {
    this.putCount += 1;
    this.objects.set(key, value);
    return { key };
  }

  async list(options?: { readonly prefix?: string }): Promise<R2ListResult> {
    const prefix = options?.prefix ?? '';
    const objects = [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort().map((key) => ({ key }));
    return { objects, truncated: false };
  }
}

export class MemoryKv implements KVNamespaceBinding {
  readonly objects = new Map<string, string>();
  readonly metadata = new Map<string, unknown>();

  async get<T = unknown>(key: string, type: 'json'): Promise<T | null> {
    if (type !== 'json') throw new Error('Memory KV supports JSON reads only');
    const value = this.objects.get(key);
    return value === undefined ? null : JSON.parse(value) as T;
  }

  async put(key: string, value: string, options?: { readonly metadata?: unknown }): Promise<void> {
    this.objects.set(key, value);
    this.metadata.set(key, options?.metadata);
  }
}

class MemoryPrepared implements D1PreparedBinding {
  readonly values: unknown[] = [];

  constructor(readonly owner: MemoryD1, readonly query: string) {}

  bind(...values: readonly unknown[]): D1PreparedBinding {
    this.values.push(...values);
    return this;
  }

  async run(): Promise<{ readonly success: boolean; readonly meta: { readonly changes: number } }> {
    this.owner.executions.push({ query: this.query, values: [...this.values] });
    return { success: true, meta: { changes: this.owner.changes } };
  }
}

export class MemoryD1 implements D1DatabaseBinding {
  readonly executions: { readonly query: string; readonly values: readonly unknown[] }[] = [];

  constructor(readonly changes = 1) {}

  prepare(query: string): D1PreparedBinding {
    return new MemoryPrepared(this, query);
  }
}

export function readyEnv(kernel?: KernelServiceBinding): DeploymentBindings {
  return {
    KERNEL_SERVICE: kernel ?? { fetch: async () => Response.json({ ok: true }) },
    PORTAL_R2: new MemoryR2(),
    PORTAL_KV: new MemoryKv(),
    PORTAL_D1: new MemoryD1(),
    PORTAL_OS_PHASE: '16',
    RESILIENCE_MODE: 'strict',
    CIRCUIT_BREAKER_MODE: 'fail-closed',
    OBSERVABILITY_MODE: 'structured',
  };
}
