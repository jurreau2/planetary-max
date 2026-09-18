import { quantumSignature } from '../cognitive/quantum_signature';
import { quantumLogic } from '../cognitive/quantum_logic';
import type { Curvature } from '../governance/curvature';
export function bridgeCurvature(curvature: Curvature) { const signature = quantumSignature([curvature.value, curvature.stable ? 1 : -1]); return { curvature, quantum: quantumLogic(signature) }; }
