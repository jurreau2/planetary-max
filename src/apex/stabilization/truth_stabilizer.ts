import { canonicalString, deepFreeze, sortedUnique, stableHash } from '../canonical.ts';
import type { JsonValue, StabilizationReport, TruthGraph } from '../types.ts';
import { expectedTruthDigest } from '../vision/structural_truth.ts';

/** Validates graph integrity, ancestry, append-only versioning, and global key consistency. */
export function stabilizeTruth(graph: TruthGraph): StabilizationReport {
  const issues: string[] = [];
  if (graph.version !== graph.nodes.length) issues.push('Truth graph version does not match append count');
  const seenIds = new Set<string>();
  const valuesByKey = new Map<string, string>();
  for (const node of graph.nodes) {
    if (node.universeId.trim().length === 0) issues.push(`Truth node universe is empty: ${node.nodeId}`);
    if (node.key.trim().length === 0) issues.push(`Truth node key is empty: ${node.nodeId}`);
    if (seenIds.has(node.nodeId)) issues.push(`Duplicate truth node: ${node.nodeId}`);
    for (const parentId of node.parentIds) {
      if (!seenIds.has(parentId)) issues.push(`Truth parent is missing or not append-ordered: ${parentId}`);
    }
    const identity: JsonValue = {
      universeId: node.universeId,
      key: node.key,
      value: node.value,
      parentIds: node.parentIds,
    };
    if (node.digest !== stableHash(identity) || node.nodeId !== `truth-${stableHash(identity)}`) {
      issues.push(`Truth node integrity mismatch: ${node.nodeId}`);
    }
    const value = canonicalString(node.value);
    const established = valuesByKey.get(node.key);
    if (established !== undefined && established !== value) {
      issues.push(`Truth contradiction: ${node.key}`);
    }
    valuesByKey.set(node.key, value);
    seenIds.add(node.nodeId);
  }
  if (graph.digest !== expectedTruthDigest(graph)) issues.push('Truth graph digest mismatch');
  const normalizedIssues = sortedUnique(issues);
  return deepFreeze({
    stable: normalizedIssues.length === 0,
    graphVersion: graph.version,
    digest: stableHash({ graphDigest: graph.digest, issues: normalizedIssues }),
    issues: normalizedIssues,
  });
}

export function assertTruthStable(graph: TruthGraph, report: StabilizationReport): void {
  const verified = stabilizeTruth(graph);
  const reportMatchesGraph = report.stable
    && report.graphVersion === verified.graphVersion
    && report.digest === verified.digest
    && report.issues.length === 0;
  if (!verified.stable || !reportMatchesGraph) {
    const issues = verified.issues.length === 0 ? ['Stabilization report does not match truth graph'] : verified.issues;
    throw new Error(`Truth graph is unstable: ${issues.join('; ')}`);
  }
}
