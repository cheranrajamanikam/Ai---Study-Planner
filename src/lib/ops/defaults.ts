import type { Baseline, BuildingState, HistoryPoint, OpsState, Policy } from "./types";

export const DEFAULT_POLICIES: Policy[] = [
  { id: "reduce_hvac", action: "Reduce HVAC output", risk: "LOW", reason: "Reversible comfort adjustment within safe temperature band.", enabled: true },
  { id: "create_ticket", action: "Create maintenance ticket", risk: "LOW", reason: "Administrative record; no physical change to the building.", enabled: true },
  { id: "notify_security", action: "Notify security", risk: "LOW", reason: "Informational alert to on-site staff.", enabled: true },
  { id: "create_security_incident", action: "Create security incident", risk: "LOW", reason: "Opens a case file; no access changes.", enabled: true },
  { id: "monitor_incident", action: "Monitor incident", risk: "LOW", reason: "Passive observation only.", enabled: true },
  { id: "switch_backup_hvac", action: "Switch to backup HVAC unit", risk: "LOW", reason: "Pre-approved failover path designed for this case.", enabled: true },
  { id: "restrict_elevator", action: "Restrict elevator", risk: "MEDIUM", reason: "Affects occupant movement and accessibility.", enabled: true },
  { id: "isolate_water", action: "Isolate water supply (floor)", risk: "MEDIUM", reason: "Cuts water to occupied areas.", enabled: true },
  { id: "restrict_server_access", action: "Restrict server room access", risk: "HIGH", reason: "Locks out staff from critical infrastructure.", enabled: true },
  { id: "emergency_evacuation", action: "Emergency evacuation", risk: "HIGH", reason: "Life-safety action with major disruption.", enabled: true },
];

export const NORMAL_BASELINE: Baseline = { temperature: 24, humidity: 52, energy: 61, occupancy: 42, waterPressure: 3.2 };

export const NORMAL_BUILDING: BuildingState = {
  temperature: 24,
  humidity: 52,
  energy: 61,
  occupancy: 42,
  waterPressure: 3.2,
  hvacZone1: 62,
  hvacZone2: 58,
  hvacZone3: 64,
  hvacFault: null,
  elevator1: "OK",
  elevator2: "OK",
  elevator3: "OK",
  elevator2Occupancy: 0,
  securityStatus: "SECURE",
  serverRoomAccess: "NORMAL",
  waterStatus: "NORMAL",
  failedAccessAttempts: 0,
};

export function efficiency(b: Pick<BuildingState, "energy" | "occupancy">): number {
  const expected = 35 + b.occupancy * 0.6;
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, b.energy - expected) * 1.5)));
}

function seedHistory(): HistoryPoint[] {
  // Deterministic seed so server and client agree; live points replace it quickly.
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => {
    const w = Math.sin(i / 3);
    const energy = Math.round(60 + w * 2);
    const occupancy = Math.round(41 + Math.cos(i / 4) * 3);
    return { t: now - (20 - i) * 3000, energy, occupancy, temperature: +(24 + w * 0.2).toFixed(1), efficiency: efficiency({ energy, occupancy }) };
  });
}

export function initialState(): OpsState {
  return {
    building: { ...NORMAL_BUILDING },
    baseline: { ...NORMAL_BASELINE },
    history: seedHistory(),
    incidents: [],
    audit: [],
    policies: DEFAULT_POLICIES.map((p) => ({ ...p })),
    tickets: [],
    notifications: 0,
    automations: {},
    agentStep: "idle",
    activeIncidentId: null,
    demoMode: true,
    demoRunning: false,
    demoStage: null,
    settings: { buildingName: "Nexus Tower", location: "Bengaluru", tickMs: 3000, agentSpeed: 1 },
    lastUpdated: new Date().toISOString(),
  };
}
