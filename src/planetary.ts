import type {
  Envelope,
  JsonObject,
  NormalizedKernelResponse,
  PlanetaryNodeSnapshot,
  PlanetaryState,
} from "./types";

export type PlanetaryFailure = Readonly<{ code: string; message: string }>;

export function initialPlanetaryState(): PlanetaryState {
  return { nodes: [] };
}

export type PlanetarySynchronization = {
  nodes?: PlanetaryNodeSnapshot[];
  globalTick?: number;
  synchronizedAt?: number;
  packetSignature?: string;
};

export function synchronizePlanetaryState(
  synchronization: PlanetarySynchronization = {},
): PlanetaryState {
  return {
    nodes: synchronization.nodes ?? [],
    globalTick: synchronization.globalTick ?? 0,
    synchronizedAt: synchronization.synchronizedAt ?? Date.now(),
    packetSignature: synchronization.packetSignature ?? "phase-19",
  };
}

export function planetaryNodeFromSnapshot(snapshot: PlanetaryNodeSnapshot): PlanetaryNodeSnapshot {
  const identity = snapshot.identity ?? { id: "unknown", signature: "unknown" };
  const substrate = snapshot.substrate ?? { stability: 0 };
  const quantum = snapshot.quantum ?? { overlay: null };

  return {
    ...snapshot,
    id: snapshot.id ?? snapshot.nodeId ?? identity.id,
    identity,
    substrate,
    quantum,
  };
}

export function planetaryMerge(
  state: PlanetaryState,
  synchronization: PlanetarySynchronization = {},
): PlanetaryState {
  const nextNodes = synchronization.nodes ?? state.nodes;
  return {
    ...state,
    nodes: nextNodes,
    globalTick: synchronization.globalTick ?? state.globalTick ?? 0,
    synchronizedAt: synchronization.synchronizedAt ?? state.synchronizedAt ?? Date.now(),
    packetSignature: synchronization.packetSignature ?? state.packetSignature ?? "phase-19",
  };
}

export const executePlanetaryTick = synchronizePlanetaryState;

export function isPlanetaryFailure(value: unknown): value is PlanetaryFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).code === "INVALID_PLANETARY_STATE" &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}

export default {
  initialPlanetaryState,
  synchronizePlanetaryState,
  planetaryNodeFromSnapshot,
  planetaryMerge,
  executePlanetaryTick,
  isPlanetaryFailure,
};
