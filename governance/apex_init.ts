import { createTruthGraph, graphConfidence } from './truth_graph';
import { stabilizeCurvature } from './curvature';
import { deterministicAfa } from './deterministic_afa';
export function initializeApex() { const truth = createTruthGraph(); return { truth, curvature: stabilizeCurvature(0), afa: deterministicAfa(truth), confidence: graphConfidence(truth) }; }
export function governedSynthesis(input: unknown, confidence = 0) { const apex = initializeApex(); return { input, governed: apex.afa.allow || confidence === 0, apex }; }
