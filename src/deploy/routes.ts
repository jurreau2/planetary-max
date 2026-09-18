import { compareText, deepFreeze, requireNonEmpty, stableHash } from '../apex/canonical.ts';
import type { JsonValue } from '../apex/types.ts';

export const FORBIDDEN_LOCAL_PATHS = Object.freeze(['/health']);

export type KernelRoute = {
  readonly routeId: string;
  readonly method: string;
  readonly path: string;
  readonly messageType: string;
  readonly destination: 'kernel';
  readonly identityRequired: true;
  readonly governanceRequired: true;
  readonly apexGovernanceRequired: true;
};

const ROUTE_TYPES: Readonly<Record<string, string>> = Object.freeze({
  'GET /universe/state': 'universe.state',
  'GET /universe/umbrella': 'universe.umbrella',
  'POST /universe/tick': 'universe.tick',
  'POST /api/kernel/message': 'kernel.message',
});

/** Resolves every request to the kernel; there is no local success or fallback destination. */
export function resolveKernelRoute(method: string, path: string): KernelRoute {
  const normalizedMethod = method.trim().toUpperCase();
  const normalizedPath = path.trim();
  requireNonEmpty(normalizedMethod, 'method');
  requireNonEmpty(normalizedPath, 'path');
  if (!normalizedPath.startsWith('/')) throw new Error('Route path must be absolute');
  if (FORBIDDEN_LOCAL_PATHS.includes(normalizedPath)) throw new Error(`Local route is forbidden: ${normalizedPath}`);
  const messageType = ROUTE_TYPES[`${normalizedMethod} ${normalizedPath}`] ?? 'kernel.http.request';
  const identity: JsonValue = { method: normalizedMethod, path: normalizedPath, messageType };
  return deepFreeze({
    routeId: `kernel-route-${stableHash(identity)}`,
    method: normalizedMethod,
    path: normalizedPath,
    messageType,
    destination: 'kernel',
    identityRequired: true,
    governanceRequired: true,
    apexGovernanceRequired: true,
  });
}

export function validateRoutingConstraints(routes: readonly KernelRoute[]): readonly string[] {
  const issues: string[] = [];
  const routeIds = new Set<string>();
  for (const route of routes) {
    if (route.destination !== 'kernel') issues.push(`Route does not target kernel: ${route.routeId}`);
    if (!route.identityRequired || !route.governanceRequired || !route.apexGovernanceRequired) {
      issues.push(`Route bypasses governance: ${route.routeId}`);
    }
    if (FORBIDDEN_LOCAL_PATHS.includes(route.path)) issues.push(`Forbidden local route: ${route.path}`);
    if (routeIds.has(route.routeId)) issues.push(`Duplicate route identifier: ${route.routeId}`);
    routeIds.add(route.routeId);
  }
  return deepFreeze([...new Set(issues)].sort(compareText));
}

export const DEPLOYMENT_ROUTES = deepFreeze([
  resolveKernelRoute('POST', '/api/kernel/message'),
  resolveKernelRoute('GET', '/universe/state'),
  resolveKernelRoute('GET', '/universe/umbrella'),
  resolveKernelRoute('POST', '/universe/tick'),
]);
