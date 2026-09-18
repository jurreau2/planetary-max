import type { QuantumSignature } from './quantum_signature';
export type QuantumResult = { amplitudes: number[]; entropy: number; signature: QuantumSignature };
export function quantumLogic(signature: QuantumSignature): QuantumResult { const amplitudes = signature.basis.map(v => (v + 1) / 2); const entropy = amplitudes.reduce((sum, p) => p > 0 && p < 1 ? sum - p * Math.log2(p) - (1 - p) * Math.log2(1 - p) : sum, 0); return { amplitudes, entropy, signature }; }
