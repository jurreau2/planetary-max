export type TruthNode = { id: string; claim: string; confidence: number; source: string; updatedAt: string };
export type TruthGraph = { nodes: TruthNode[]; edges: Array<{ from: string; to: string; relation: 'supports' | 'contradicts' }> };
export function createTruthGraph(): TruthGraph { return { nodes: [], edges: [] }; }
export function addTruth(graph: TruthGraph, node: TruthNode): TruthGraph { return { ...graph, nodes: [...graph.nodes.filter(n => n.id !== node.id), node] }; }
export function graphConfidence(graph: TruthGraph): number { return graph.nodes.length ? graph.nodes.reduce((a, n) => a + n.confidence, 0) / graph.nodes.length : 0; }
