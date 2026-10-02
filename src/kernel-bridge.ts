export type QuantumBranch = {
  id: string;
  probability: number;
  curvature: number;
  signature: string;
  stateDelta?: Record<string, unknown>;
};

export function collapseQuantumBranches(
  branches: QuantumBranch[],
  _input?: unknown,
  _meta?: unknown,
): QuantumBranch {
  return branches[0] ?? { id: "default", probability: 1, curvature: 0, signature: "default" };
}
