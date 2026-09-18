import { compareText, deepFreeze, stableHash } from '../apex/canonical.ts';
import type { JsonValue } from '../apex/types.ts';
import type { D1DatabaseBinding } from '../bindings/d1.ts';
import type { KVNamespaceBinding } from '../bindings/kv.ts';
import type { R2BucketBinding } from '../bindings/r2.ts';
import { DEPLOYMENT_ROUTES, validateRoutingConstraints } from './routes.ts';
import type { KernelRoute } from './routes.ts';
import {
  EXPECTED_CIRCUIT_BREAKER_MODE,
  EXPECTED_OBSERVABILITY_MODE,
  EXPECTED_PORTAL_OS_PHASE,
  EXPECTED_RESILIENCE_MODE,
  REQUIRED_BINDINGS,
  SUBSTRATE_CAPABILITIES,
  validateBindingManifest,
  validateSubstrateCapabilities,
} from './validation.ts';
import type { BindingManifest, SubstrateCapabilities } from './validation.ts';

export type KernelServiceBinding = { fetch(request: Request): Promise<Response> };

export type DeploymentBindings = {
  readonly KERNEL_SERVICE: KernelServiceBinding;
  readonly PORTAL_R2: R2BucketBinding;
  readonly PORTAL_KV: KVNamespaceBinding;
  readonly PORTAL_D1: D1DatabaseBinding;
  readonly PORTAL_OS_PHASE: string;
  readonly RESILIENCE_MODE: string;
  readonly CIRCUIT_BREAKER_MODE: string;
  readonly OBSERVABILITY_MODE: string;
};

export type ReadinessReport = {
  readonly ready: boolean;
  readonly phase: string;
  readonly issues: readonly string[];
  readonly digest: string;
};

function isFunction(value: unknown): value is (...args: readonly unknown[]) => unknown {
  return typeof value === 'function';
}

function validateRuntimeBindings(env: Partial<DeploymentBindings>): readonly string[] {
  const issues: string[] = [];
  if (!isFunction(env.KERNEL_SERVICE?.fetch)) issues.push('KERNEL_SERVICE binding is missing');
  if (!isFunction(env.PORTAL_R2?.head) || !isFunction(env.PORTAL_R2?.get) || !isFunction(env.PORTAL_R2?.put) || !isFunction(env.PORTAL_R2?.list)) {
    issues.push(`${REQUIRED_BINDINGS.r2} binding is missing`);
  }
  if (!isFunction(env.PORTAL_KV?.get) || !isFunction(env.PORTAL_KV?.put)) issues.push(`${REQUIRED_BINDINGS.kv} binding is missing`);
  if (!isFunction(env.PORTAL_D1?.prepare)) issues.push(`${REQUIRED_BINDINGS.d1} binding is missing`);
  return issues;
}

/** Fails closed unless every deployment, routing, durability, fencing, and stability gate passes. */
export function validateDeploymentReadiness(
  env: Partial<DeploymentBindings>,
  routes: readonly KernelRoute[] = DEPLOYMENT_ROUTES,
  capabilities: SubstrateCapabilities = SUBSTRATE_CAPABILITIES,
  manifest: BindingManifest = REQUIRED_BINDINGS,
): ReadinessReport {
  const issues = [
    ...validateRuntimeBindings(env),
    ...validateBindingManifest(manifest),
    ...validateRoutingConstraints(routes),
    ...validateSubstrateCapabilities(capabilities),
  ];
  if (env.PORTAL_OS_PHASE !== EXPECTED_PORTAL_OS_PHASE) issues.push(`PORTAL_OS_PHASE must be ${EXPECTED_PORTAL_OS_PHASE}`);
  if (env.RESILIENCE_MODE !== EXPECTED_RESILIENCE_MODE) issues.push(`RESILIENCE_MODE must be ${EXPECTED_RESILIENCE_MODE}`);
  if (env.CIRCUIT_BREAKER_MODE !== EXPECTED_CIRCUIT_BREAKER_MODE) issues.push(`CIRCUIT_BREAKER_MODE must be ${EXPECTED_CIRCUIT_BREAKER_MODE}`);
  if (env.OBSERVABILITY_MODE !== EXPECTED_OBSERVABILITY_MODE) issues.push(`OBSERVABILITY_MODE must be ${EXPECTED_OBSERVABILITY_MODE}`);
  const normalizedIssues = deepFreeze([...new Set(issues)].sort(compareText));
  const identity: JsonValue = { phase: env.PORTAL_OS_PHASE ?? '', issues: normalizedIssues };
  return deepFreeze({
    ready: normalizedIssues.length === 0,
    phase: env.PORTAL_OS_PHASE ?? '',
    issues: normalizedIssues,
    digest: `readiness-${stableHash(identity)}`,
  });
}
