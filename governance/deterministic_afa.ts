import type { TruthGraph } from './truth_graph';
export type AfaDecision = { allow: boolean; score: number; reasons: string[] };
export function deterministicAfa(graph: TruthGraph, requestedConfidence = 0): AfaDecision { const score = graph.nodes.length ? graph.nodes.reduce((a, n) => a + n.confidence, 0) / graph.nodes.length : 0; const reasons = score >= requestedConfidence ? ['truth confidence satisfies request'] : ['truth confidence below requested threshold']; return { allow: score >= requestedConfidence, score, reasons }; }
