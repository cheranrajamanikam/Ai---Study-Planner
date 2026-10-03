import { classify, decisionLabel } from "@/lib/ops/governanceService";
import type { AgentResponse, OpsState } from "@/lib/ops/types";

/** Compact, serialisable view of the building the agent reasons over (also sent to the LLM). */
export function snapshotFor(s: OpsState) {
  return {
    building: s.settings.buildingName,
    state: s.building,
    openIncidents: s.incidents
      .filter((i) => i.status !== "RESOLVED")
      .map((i) => ({
        title: i.title,
        severity: i.severity,
        status: i.status,
        rootCause: i.rootCause ?? null,
        awaitingApproval: i.actions.filter((a) => a.status === "awaiting").map((a) => a.label),
      })),
    policies: s.policies.map((p) => ({ action: p.action, id: p.id, risk: p.risk, enabled: p.enabled })),
  };
}
export type AgentSnapshot = ReturnType<typeof snapshotFor>;

/**
 * Deterministic local agent. Used when no LLM is configured or reachable,
 * so the demo always produces grounded, structured answers.
 */
export function localAnswer(question: string, snap: AgentSnapshot): AgentResponse {
  const q = question.toLowerCase();
  const b = snap.state;
  const open = snap.openIncidents;
  const policies = snap.policies.map((p) => ({ ...p, reason: "" }));
  const gov = (id: Parameters<typeof classify>[0]) => {
    const c = classify(id, policies);
    return `${id.replace(/_/g, " ")} → ${c.risk} RISK → ${decisionLabel(c.decision)}`;
  };
  const base = { source: "local" as const };

  if (/approv|authori|sign.?off/.test(q)) {
    const pending = open.filter((i) => i.awaitingApproval.length);
    return {
      ...base,
      observation: pending.length ? `${pending.length} incident(s) are paused at a governance gate.` : "No actions are waiting for approval.",
      investigation: "Checked every open incident for actions classified MEDIUM or HIGH risk.",
      evidence: pending.length ? pending.flatMap((i) => i.awaitingApproval.map((a) => `${i.title}: ${a}`)) : ["All planned actions are either executed or auto-approved."],
      decision: pending.length ? "Hold these actions until an operator authorizes them." : "Nothing to authorize.",
      recommendedAction: pending.length ? "Open the Incident Center and press AUTHORIZE RESPONSE on each item." : "No action needed.",
      governanceDecision: pending.length ? "MEDIUM/HIGH RISK → HUMAN APPROVAL REQUIRED" : "—",
      executionStatus: pending.length ? "Awaiting operator" : "Idle",
    };
  }

  if (/incident|attention|alert|problem|wrong/.test(q)) {
    return {
      ...base,
      observation: open.length ? `${open.length} open incident(s) in ${snap.building}.` : `${snap.building} has no open incidents.`,
      investigation: "Ranked open incidents by severity and status.",
      evidence: open.length ? open.map((i) => `${i.severity} · ${i.title} — ${i.status}`) : [`Energy ${Math.round(b.energy)} kW, temperature ${b.temperature}°C, all elevators reporting.`],
      decision: open.length ? `Prioritise "${[...open].sort((a, z) => (z.severity === "HIGH" ? 1 : 0) - (a.severity === "HIGH" ? 1 : 0))[0].title}".` : "Continue monitoring.",
      recommendedAction: open.some((i) => i.awaitingApproval.length) ? "Review the actions waiting for your approval." : open.length ? "Let the agent finish its response or open the incident." : "No action needed.",
      governanceDecision: "Per-action classification shown on each incident.",
      executionStatus: open.length ? "In progress" : "Idle",
    };
  }

  if (/elevator|lift/.test(q)) {
    const faulty = (["elevator1", "elevator2", "elevator3"] as const).filter((k) => b[k] !== "OK");
    return {
      ...base,
      observation: faulty.length ? faulty.map((k) => `${k.replace("elevator", "Elevator ")}: ${b[k]}`).join(", ") : "All 3 elevators operational.",
      investigation: "Read car status, load sensors and controller fault codes.",
      evidence: faulty.length ? [`Elevator 2 occupants: ${b.elevator2Occupancy}`, "Drive controller fault on car 2", "Cars 1 and 3 healthy"] : ["No controller faults reported."],
      decision: b.elevator2 === "ERROR" ? "Secure the car, dispatch maintenance, keep occupants informed." : "No intervention needed.",
      recommendedAction: b.elevator2 === "ERROR" ? "Notify security, create maintenance ticket, restrict Elevator 2." : "None.",
      governanceDecision: b.elevator2 === "ERROR" ? `${gov("notify_security")}; ${gov("create_ticket")}; ${gov("restrict_elevator")}` : "—",
      executionStatus: b.elevator2 === "ERROR" ? "Restriction requires operator authorization" : b.elevator2 === "RESTRICTED" ? "Elevator 2 restricted — maintenance dispatched" : "Idle",
      suggestedAutomation: b.elevator2 === "ERROR" ? "elevator_response" : null,
    };
  }

  if (/secur|access|intru|server room|badge/.test(q)) {
    return {
      ...base,
      observation: `Security status ${b.securityStatus}; server room access ${b.serverRoomAccess}; ${b.failedAccessAttempts} failed attempts.`,
      investigation: "Correlated badge events with time of day and room classification.",
      evidence: b.failedAccessAttempts ? ["Restricted room", "Outside staffed hours (02:13 AM)", `${b.failedAccessAttempts} repeated failures`] : ["No abnormal access events."],
      decision: b.securityStatus === "ALERT" ? "Treat as an intrusion attempt." : "No threat detected.",
      recommendedAction: b.securityStatus === "ALERT" ? "Create security incident, notify security, restrict server room access." : "None.",
      governanceDecision: b.securityStatus === "ALERT" ? `${gov("create_security_incident")}; ${gov("restrict_server_access")}` : "—",
      executionStatus: b.securityStatus === "ALERT" ? "Lockdown requires operator authorization" : "Idle",
      suggestedAutomation: b.securityStatus === "ALERT" ? "security_response" : null,
    };
  }

  if (/water|leak|pressure/.test(q)) {
    return {
      ...base,
      observation: `Water ${b.waterStatus}, pressure ${b.waterPressure} bar.`,
      investigation: "Compared riser pressure and humidity against baseline.",
      evidence: [`Pressure ${b.waterPressure} bar (normal 3.2)`, `Humidity ${Math.round(b.humidity)}%`],
      decision: b.waterStatus === "LEAK" ? "Isolate the affected floor and dispatch plumbing." : "Water system healthy.",
      recommendedAction: b.waterStatus === "LEAK" ? "Isolate Floor 2 water supply and create a ticket." : "None.",
      governanceDecision: b.waterStatus === "LEAK" ? gov("isolate_water") : "—",
      executionStatus: b.waterStatus === "LEAK" ? "Isolation requires operator authorization" : "Idle",
    };
  }

  if (/energy|power|optimi|kw|consum|hvac|cost/.test(q)) {
    const zones = [b.hvacZone1, b.hvacZone2, b.hvacZone3];
    const hot = zones.indexOf(Math.max(...zones)) + 1;
    const high = b.energy > 75;
    return {
      ...base,
      observation: `Energy draw is ${Math.round(b.energy)} kW (baseline ~61 kW) at ${Math.round(b.occupancy)}% occupancy.`,
      investigation: "Compared each HVAC zone's output against occupancy and temperature.",
      evidence: [`HVAC zones: ${zones.map((z, i) => `Z${i + 1} ${z}%`).join(", ")}`, `Temperature ${b.temperature}°C`, `Occupancy ${Math.round(b.occupancy)}%`],
      decision: high ? `HVAC Zone ${hot} is over-producing for current occupancy.` : `Consumption is within range; Zone ${hot} (${zones[hot - 1]}%) is the best optimisation target.`,
      recommendedAction: `Reduce HVAC Zone ${hot} output by 15%.`,
      governanceDecision: gov("reduce_hvac"),
      executionStatus: "Ready — run Energy Optimization to execute and verify.",
      suggestedAutomation: "energy_optimization",
    };
  }

  return {
    ...base,
    observation: `${snap.building}: ${b.temperature}°C, ${Math.round(b.energy)} kW, ${Math.round(b.occupancy)}% occupied, security ${b.securityStatus}.`,
    investigation: "Scanned all subsystems for deviations from baseline.",
    evidence: [
      `Elevators: ${[b.elevator1, b.elevator2, b.elevator3].join(" / ")}`,
      `Water: ${b.waterStatus}`,
      `HVAC fault: ${b.hvacFault ? `Zone ${b.hvacFault}` : "none"}`,
      `${open.length} open incident(s)`,
    ],
    decision: open.length ? "Attention needed on open incidents." : "Building operating normally.",
    recommendedAction: open.length ? "Ask “What incidents need my attention?”" : "Continue monitoring.",
    governanceDecision: "—",
    executionStatus: "Observing",
  };
}
