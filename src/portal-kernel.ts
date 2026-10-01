import type { KernelEnvelope, KernelResult } from "./contracts";
import type {
  KernelLane,
  PortalKernelState,
  SimEvent,
  SimEventType,
  SimAgentState,
  SimWindowState,
  SimTecTaskState,
  SimSubstrateState,
  SimTickDiff,
  QuantumOverlay,
  QuantumBranch,
  GovernanceMetadata,
  UmbrellaMode,
  QuantumCollapsePolicy,
  InstituteState,
  EpistemicTimeline,
  PlanetaryState,
  PlanetarySynchronization,
  PlanetaryGovernanceContext,
  PlanetaryNodeSnapshot,
  PlanetaryQuantumState,
  PlanetaryIdentity,
} from "./types";
import {
  formInstituteTruth,
  initialInstituteState,
  isInstituteFormationFailure,
  parseTruthFormation,
  type InstituteFormationFailure,
  type InstituteFormationResult,
  type InstituteTruthGovernance,
} from "./institute";
import {
  initialPlanetaryState,
  executePlanetaryRuntime,
  isPlanetaryFailure,
  parsePlanetarySynchronization,
  synchronizePlanetaryRuntime,
  type PlanetaryFailure,
} from "./planetary";

type KernelEnvironment = {
  PLANETARY_MODE?: string;
  UMBRELLA_ENFORCEMENT?: string;
};
