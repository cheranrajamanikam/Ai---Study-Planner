import type { ActionId, GovernanceDecision, Policy, Risk } from "./types";

/**
 * Governance engine. Every AI recommendation passes through classify()
 * before the action engine is allowed to touch the building.
 */
export function findPolicy(actionId: ActionId, policies: Policy[]): Policy | undefined {
  return policies.find((p) => p.id === actionId);
}

export function decisionForRisk(risk: Risk): GovernanceDecision {
  return risk === "LOW" ? "AUTO" : "APPROVAL";
}

export function classify(actionId: ActionId, policies: Policy[]): { risk: Risk; decision: GovernanceDecision; reason: string } {
  const p = findPolicy(actionId, policies);
  if (!p) return { risk: "HIGH", decision: "BLOCK", reason: "No policy exists for this action." };
  if (!p.enabled) return { risk: p.risk, decision: "BLOCK", reason: "Policy disabled by operator." };
  return { risk: p.risk, decision: decisionForRisk(p.risk), reason: p.reason };
}

export function decisionLabel(d: GovernanceDecision): string {
  return d === "AUTO" ? "AUTO APPROVED" : d === "APPROVAL" ? "HUMAN APPROVAL REQUIRED" : "BLOCKED";
}

export function maxRisk(risks: Risk[]): Risk {
  if (risks.includes("HIGH")) return "HIGH";
  if (risks.includes("MEDIUM")) return "MEDIUM";
  return "LOW";
}
