import { canonicalString, compareText, deepFreeze, requireNonEmpty, sortedUnique, stableHash } from '../canonical.ts';
import type { JsonValue, TruthGraph, TruthNode } from '../types.ts';

export type TruthAssertion = {
  readonly universeId: string;
  readonly key: string;
  readonly value: JsonValue;
  readonly parentIds?: readonly string[];
};

function graphDigest(nodes: readonly TruthNode[]): string {
  return stableHash(nodes.map((node) => ({ nodeId: node.nodeId, digest: node.digest })));
}

export function createTruthGraph(): TruthGraph {
  const nodes: readonly TruthNode[] = Object.freeze([]);
  return deepFreeze({ version: 0, nodes, digest: graphDigest(nodes) });
}

/** Appends immutable truth while rejecting the same structural key with a different value. */
export function appendStructuralTruth(graph: TruthGraph, assertion: TruthAssertion): TruthGraph {
  requireNonEmpty(assertion.universeId, 'truth universeId');
  requireNonEmpty(assertion.key, 'truth key');
  const valueIdentity = canonicalString(assertion.value);
  const existingForKey = graph.nodes.filter((node) => node.key === assertion.key);
  if (existingForKey.some((node) => canonicalString(node.value) !== valueIdentity)) {
    throw new Error(`Structural truth contradiction for key: ${assertion.key}`);
  }
  const parents = sortedUnique(assertion.parentIds ?? []);
  const knownIds = new Set(graph.nodes.map((node) => node.nodeId));
  for (const parentId of parents) {
    if (!knownIds.has(parentId)) throw new Error(`Unknown structural truth parent: ${parentId}`);
  }
  const identity: JsonValue = {
    universeId: assertion.universeId,
    key: assertion.key,
    value: assertion.value,
    parentIds: parents,
  };
  const nodeId = `truth-${stableHash(identity)}`;
  if (graph.nodes.some((node) => node.nodeId === nodeId)) return graph;
  const node = deepFreeze({
    nodeId,
    universeId: assertion.universeId,
    key: assertion.key,
    value: assertion.value,
    parentIds: parents,
    digest: stableHash(identity),
  });
  const nodes = deepFreeze([...graph.nodes, node]);
  return deepFreeze({ version: graph.version + 1, nodes, digest: graphDigest(nodes) });
}

export function truthValues(graph: TruthGraph, key: string): readonly JsonValue[] {
  return deepFreeze(
    graph.nodes
      .filter((node) => node.key === key)
      .sort((left, right) => compareText(left.universeId, right.universeId))
      .map((node) => node.value),
  );
}

export function expectedTruthDigest(graph: TruthGraph): string {
  return graphDigest(graph.nodes);
}
