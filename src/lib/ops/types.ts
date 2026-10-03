export type IncidentType = "energy_spike" | "elevator_failure" | "unauthorized_access" | "water_leak" | "hvac_failure";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "ACTIVE" | "INVESTIGATING" | "AWAITING APPROVAL" | "EXECUTING" | "RESOLVED";
export type Risk = "LOW" | "MEDIUM" | "HIGH";
export type GovernanceDecision = "AUTO" | "APPROVAL" | "BLOCK";
export type ElevatorStatus = "OK" | "ERROR" | "RESTRICTED";

export type ActionId =
  | "reduce_hvac"
  | "create_ticket"
  | "notify_security"
  | "create_security_incident"
  | "monitor_incident"
  | "switch_backup_hvac"
  | "restrict_elevator"
  | "isolate_water"
  | "restrict_server_access"
  | "emergency_evacuation";

export interface BuildingState {
  temperature: number;
  humidity: number;
  energy: number;
  occupancy: number;
  waterPressure: number;
  hvacZone1: number;
  hvacZone2: number;
  hvacZone3: number;
  hvacFault: 1 | 2 | 3 | null;
  elevator1: ElevatorStatus;
  elevator2: ElevatorStatus;
  elevator3: ElevatorStatus;
  elevator2Occupancy: number;
  securityStatus: "SECURE" | "ALERT" | "LOCKED DOWN";
  serverRoomAccess: "NORMAL" | "LOCKED";
  waterStatus: "NORMAL" | "LEAK" | "ISOLATED";
  failedAccessAttempts: number;
}

/** Values the simulation oscillates around. Incidents and actions move the baseline. */
export interface Baseline {
  temperature: number;
  humidity: number;
  energy: number;
  occupancy: number;
  waterPressure: number;
}

export interface HistoryPoint {
  t: number;
  energy: number;
  occupancy: number;
  temperature: number;
  efficiency: number;
}

export interface Policy {
  id: ActionId;
  action: string;
  risk: Risk;
  reason: string;
  enabled: boolean;
}

export interface PlannedAction {
  id: string;
  actionId: ActionId;
  label: string;
  risk: Risk;
  decision: GovernanceDecision;
  status: "planned" | "awaiting" | "executed" | "blocked" | "rejected";
  detail?: string;
}

export interface Verification {
  expected: string;
  actual: string;
  status: "SUCCESS" | "FAILED";
  impact: string;
  before: string;
  after: string;
  action: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  title: string;
  severity: Severity;
  location: string;
  detectedAt: string;
  confidence: number | null;
  status: IncidentStatus;
  requiredAction: string;
  rootCause?: string;
  evidence: string[];
  actions: PlannedAction[];
  verification?: Verification;
  context: Record<string, string | number>;
  resolvedAt?: string;
  note?: string;
}

export type AuditType = "INCIDENT" | "AI" | "GOVERNANCE" | "ACTION" | "AUTOMATION" | "VERIFICATION" | "RESULT" | "SYSTEM";
export type Actor = "AI Agent" | "Operator" | "Governance Engine" | "Simulation" | "Automation";

export interface AuditEvent {
  id: string;
  ts: string;
  type: AuditType;
  title: string;
  description: string;
  actor: Actor;
  risk: Risk | "-";
  status: string;
}

export type AgentStep =
  | "idle"
  | "observing"
  | "investigating"
  | "planning"
  | "governance"
  | "awaiting"
  | "executing"
  | "verifying"
  | "completed";

export interface Ticket {
  id: string;
  title: string;
  createdAt: string;
  status: "OPEN" | "CLOSED";
}

export interface AutomationRun {
  status: "idle" | "running" | "success" | "failed" | "blocked" | "needs_approval";
  lastRun?: string;
  step: number;
  message?: string;
}

export interface Settings {
  buildingName: string;
  location: string;
  tickMs: number;
  agentSpeed: number; // multiplier for agent step delays
}

export interface OpsState {
  building: BuildingState;
  baseline: Baseline;
  history: HistoryPoint[];
  incidents: Incident[];
  audit: AuditEvent[];
  policies: Policy[];
  tickets: Ticket[];
  notifications: number;
  automations: Record<string, AutomationRun>;
  agentStep: AgentStep;
  activeIncidentId: string | null;
  demoMode: boolean;
  demoRunning: boolean;
  demoStage: string | null;
  settings: Settings;
  lastUpdated: string;
}

export interface AgentResponse {
  observation: string;
  investigation: string;
  evidence: string[];
  decision: string;
  recommendedAction: string;
  governanceDecision: string;
  executionStatus: string;
  suggestedAutomation?: string | null;
  source: "llm" | "local";
  note?: string;
}
