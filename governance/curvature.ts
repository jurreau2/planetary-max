export type Curvature = { value: number; threshold: number; stable: boolean; reason: string };
export function stabilizeCurvature(input: number, threshold = 1): Curvature { const value = Math.max(-1, Math.min(1, input)); return { value, threshold, stable: Math.abs(value) <= threshold, reason: Math.abs(value) <= threshold ? 'within governance bounds' : 'requires correction' }; }
