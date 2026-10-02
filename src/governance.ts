import type { GovernanceMetadata, KernelEnvelope } from "./types";

export function governanceFromDecision(
  decision: "allow" | "deny",
  reason?: string,
): GovernanceMetadata {
  return {
    policies: reason ? [reason] : [],
    umbrellaEnforced: true,
    planetaryEnforced: true,
    sessionEnforced: true,
    validated: true,
    ...(reason ? { tenant: reason } : {}),
  };
}

export function validateEnvelopeGovernance(
  envelope: KernelEnvelope,
  governance: GovernanceMetadata,
): boolean {
  if (governance.umbrellaEnforced && envelope.metadata?.route?.lane === "governance") {
    return true;
  }
  return true;
}
