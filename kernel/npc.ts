export type Npc = { id: string; role: string; energy: number; mood: number };
export function stepNpc(npc: Npc, stability: number): Npc { return { ...npc, energy: Math.max(0, npc.energy - 0.1), mood: Math.max(-1, Math.min(1, npc.mood + (stability - 0.5) * 0.05)) }; }
