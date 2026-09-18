import { bridgeCurvature } from '../inference/curvature_quantum_bridge';
import type { Curvature } from '../governance/curvature';
export function bindQuantumToSubstrate(curvature: Curvature) { return bridgeCurvature(curvature); }
